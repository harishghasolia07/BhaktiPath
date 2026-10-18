// Where clips live. MongoDB when MONGODB_URI is set; otherwise a local JSON
// file (.data/clips.json, seeded from data/sample-clips.json) so the site can
// be built and tried before the database exists. No Next.js imports here: the
// CLI scripts use this module too.
import { promises as fs } from "node:fs";
import path from "node:path";
import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import { clipInputSchema, makeSlug, normCategory, type Clip, type ClipData, type ClipInput } from "./clip-schema";

export interface ClipStore {
  readonly kind: "mongodb" | "file";
  list(): Promise<Clip[]>;
  getBySlug(slug: string): Promise<Clip | null>;
  getById(id: string): Promise<Clip | null>;
  create(input: ClipInput): Promise<Clip>;
  update(id: string, input: ClipInput): Promise<Clip>;
  remove(id: string): Promise<boolean>;
  /** Touches the database (keeps the free Atlas cluster from pausing). */
  ping(): Promise<void>;
}

export class ClipValidationError extends Error {
  constructor(public readonly issues: Record<string, string>) {
    super(Object.values(issues).join(" "));
  }
}

export function validateClip(input: ClipInput): ClipData {
  const r = clipInputSchema.safeParse(input);
  if (r.success) return r.data;
  const issues: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = String(i.path[0] ?? "form");
    issues[key] ??= i.message;
  }
  throw new ClipValidationError(issues);
}

function newest(a: Clip, b: Clip) {
  return b.createdAt.localeCompare(a.createdAt);
}

async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  let slug = base;
  for (let n = 2; await taken(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/* ---------------- MongoDB ---------------- */

type ClipDoc = Omit<Clip, "id" | "createdAt" | "updatedAt"> & {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type Cached = { uri: string; client: Promise<MongoClient>; indexes?: Promise<unknown> };
const g = globalThis as unknown as { __clipMongo2?: Cached };

/** One client per process (and across dev hot reloads), per connection string. A failed attempt is never kept. */
function cached(uri: string): Cached {
  if (g.__clipMongo2?.uri === uri) return g.__clipMongo2;
  const entry: Cached = {
    uri,
    client: (async () => {
      const c = new MongoClient(uri, { maxPoolSize: 5, appName: "shravanam-kirtanam" });
      if (process.env.VERCEL) {
        // Lets Vercel's Fluid compute close idle pool connections before a function is suspended.
        const { attachDatabasePool } = await import("@vercel/functions");
        attachDatabasePool(c);
      }
      return c.connect();
    })(),
  };
  g.__clipMongo2 = entry;
  entry.client.catch(() => {
    // wrong password, no network, ...: forget it, so the next request tries again
    if (g.__clipMongo2 === entry) g.__clipMongo2 = undefined;
  });
  return entry;
}

async function client(uri: string): Promise<MongoClient> {
  return cached(uri).client;
}

function fromDoc(d: ClipDoc): Clip {
  return {
    id: d._id.toHexString(),
    slug: d.slug,
    title: d.title,
    videoId: d.videoId,
    start: d.start,
    end: d.end,
    category: normCategory(d.category),
    tags: d.tags ?? [],
    videoTitle: d.videoTitle ?? "",
    lyrics: d.lyrics ?? "",
    place: d.place ?? "",
    day: d.day ?? null,
    sample: Boolean(d.sample),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function mongoStore(uri: string): ClipStore {
  const col = async (): Promise<Collection<ClipDoc>> => {
    const entry = cached(uri);
    const c = (await entry.client).db(process.env.MONGODB_DB || "shravanam").collection<ClipDoc>("clips");
    entry.indexes ??= c.createIndex({ slug: 1 }, { unique: true });
    try {
      await entry.indexes;
    } catch (err) {
      entry.indexes = undefined;
      throw err;
    }
    return c;
  };
  const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

  return {
    kind: "mongodb",
    async list() {
      const docs = await (await col()).find({}).sort({ createdAt: -1 }).toArray();
      return docs.map(fromDoc);
    },
    async getBySlug(slug) {
      const d = await (await col()).findOne({ slug });
      return d ? fromDoc(d) : null;
    },
    async getById(id) {
      const _id = oid(id);
      const d = _id && (await (await col()).findOne({ _id }));
      return d ? fromDoc(d) : null;
    },
    async create(input) {
      const data = validateClip(input);
      const c = await col();
      const slug = await uniqueSlug(makeSlug(data.title, data.videoId, data.start), async (s) =>
        Boolean(await c.findOne({ slug: s }, { projection: { _id: 1 } })),
      );
      const now = new Date();
      const doc: ClipDoc = { _id: new ObjectId(), ...data, slug, createdAt: now, updatedAt: now };
      await c.insertOne(doc);
      return fromDoc(doc);
    },
    async update(id, input) {
      const data = validateClip(input);
      const _id = oid(id);
      if (!_id) throw new Error("Clip not found.");
      // The slug stays as it was, so links already shared keep working.
      const d = await (await col()).findOneAndUpdate(
        { _id },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: "after" },
      );
      if (!d) throw new Error("Clip not found.");
      return fromDoc(d);
    },
    async remove(id) {
      const _id = oid(id);
      if (!_id) return false;
      return (await (await col()).deleteOne({ _id })).deletedCount === 1;
    },
    async ping() {
      await (await client(uri)).db("admin").command({ ping: 1 });
    },
  };
}

/** The Mongo database (same connection as the clips), or null when running on the local file store. */
export async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.VERCEL) throw new Error("MONGODB_URI is not set in this Vercel project's environment variables.");
    return null;
  }
  return (await cached(uri).client).db(process.env.MONGODB_DB || "shravanam");
}

/* ---------------- Local JSON file ---------------- */

function fileStore(): ClipStore {
  const root = process.cwd();
  const file = path.join(root, ".data", "clips.json");
  const seed = path.join(root, "data", "sample-clips.json");

  const withDefaults = (list: Clip[]): Clip[] =>
    list.map(
      (c) =>
        ({ ...c, category: normCategory(c.category), lyrics: c.lyrics ?? "", place: c.place ?? "", day: c.day ?? null, tags: c.tags ?? [], videoTitle: c.videoTitle ?? "", sample: c.sample ?? false }) as Clip,
    );
  async function read(): Promise<Clip[]> {
    try {
      return withDefaults(JSON.parse(await fs.readFile(file, "utf8")) as Clip[]);
    } catch {
      try {
        return withDefaults(JSON.parse(await fs.readFile(seed, "utf8")) as Clip[]);
      } catch {
        return [];
      }
    }
  }
  async function write(clips: Clip[]) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(clips, null, 2) + "\n");
  }

  return {
    kind: "file",
    async list() {
      return (await read()).sort(newest);
    },
    async getBySlug(slug) {
      return (await read()).find((c) => c.slug === slug) ?? null;
    },
    async getById(id) {
      return (await read()).find((c) => c.id === id) ?? null;
    },
    async create(input) {
      const data = validateClip(input);
      const clips = await read();
      const slug = await uniqueSlug(makeSlug(data.title, data.videoId, data.start), async (s) =>
        clips.some((c) => c.slug === s),
      );
      const now = new Date().toISOString();
      const clip: Clip = { id: new ObjectId().toHexString(), ...data, slug, createdAt: now, updatedAt: now };
      await write([clip, ...clips]);
      return clip;
    },
    async update(id, input) {
      const data = validateClip(input);
      const clips = await read();
      const i = clips.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("Clip not found.");
      clips[i] = { ...clips[i], ...data, updatedAt: new Date().toISOString() };
      await write(clips);
      return clips[i];
    },
    async remove(id) {
      const clips = await read();
      const left = clips.filter((c) => c.id !== id);
      if (left.length === clips.length) return false;
      await write(left);
      return true;
    },
    async ping() {},
  };
}

let store: ClipStore | undefined;

export function getStore(): ClipStore {
  if (store) return store;
  const uri = process.env.MONGODB_URI;
  if (uri) store = mongoStore(uri);
  else if (process.env.VERCEL) throw new Error("MONGODB_URI is not set in this Vercel project's environment variables.");
  else store = fileStore();
  return store;
}
