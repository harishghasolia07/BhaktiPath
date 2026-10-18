// People who signed in with Google, what they keep (likes, recently played) and the YouTube
// videos they add for themselves. MongoDB when MONGODB_URI is set, otherwise local JSON files.
import { promises as fs } from "node:fs";
import path from "node:path";
import { ObjectId, type Db } from "mongodb";
import { type Clip, type ClipInput } from "./clip-schema";
import { ClipValidationError, getMongoDb, validateClip } from "./store";

export type User = {
  id: string;
  name: string;
  email: string;
  picture: string;
  favs: string[];
  recent: string[];
  played: string[];
};

export type GoogleProfile = { sub: string; name: string; email: string; picture: string };

export const LIMITS = { favs: 500, recent: 30, played: 2000, videos: 200 } as const;

export interface AccountStore {
  upsertGoogleUser(p: GoogleProfile): Promise<User>;
  getUser(id: string): Promise<User | null>;
  setFav(userId: string, key: string, on: boolean): Promise<void>;
  markPlayed(userId: string, key: string): Promise<void>;
  listVideos(userId: string): Promise<Clip[]>;
  getVideo(userId: string, id: string): Promise<Clip | null>;
  createVideo(userId: string, input: ClipInput): Promise<Clip>;
  updateVideo(userId: string, id: string, input: ClipInput): Promise<Clip>;
  removeVideo(userId: string, id: string): Promise<boolean>;
}

/** Likes and play history use "my-<id>" for a person's own videos and the clip slug for the public ones. */
export const myKey = (id: string) => `my-${id}`;

type VideoRow = Omit<Clip, "id" | "owner" | "slug"> & { id: string; ownerId: string };
/** Only the clip's own fields: never database internals such as Mongo's _id. */
const toClip = (r: VideoRow): Clip => ({
  id: r.id,
  slug: myKey(r.id),
  owner: r.ownerId,
  title: r.title,
  videoId: r.videoId,
  start: r.start,
  end: r.end,
  category: r.category,
  tags: r.tags ?? [],
  videoTitle: r.videoTitle ?? "",
  lyrics: r.lyrics ?? "",
  place: "",
  day: null,
  sample: false,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const addFirst = (list: string[], key: string, max: number) => [key, ...list.filter((x) => x !== key)].slice(0, max);

/* ---------------- MongoDB ---------------- */

type UserDoc = { _id: ObjectId; sub: string; name: string; email: string; picture: string; favs: string[]; recent: string[]; played: string[]; createdAt: Date };
type VideoDoc = Omit<VideoRow, "id" | "createdAt" | "updatedAt"> & { _id: ObjectId; createdAt: Date; updatedAt: Date };

const userOf = (d: UserDoc): User => ({
  id: d._id.toHexString(),
  name: d.name,
  email: d.email,
  picture: d.picture,
  favs: d.favs ?? [],
  recent: d.recent ?? [],
  played: d.played ?? [],
});
const videoOf = (d: VideoDoc): Clip =>
  toClip({ ...d, id: d._id.toHexString(), createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() });

function mongoAccounts(db: Db): AccountStore {
  const users = db.collection<UserDoc>("users");
  const videos = db.collection<VideoDoc>("uservideos");
  let ready: Promise<unknown> | undefined;
  const init = async () => {
    ready ??= Promise.all([users.createIndex({ sub: 1 }, { unique: true }), videos.createIndex({ ownerId: 1, createdAt: -1 })]);
    try {
      await ready;
    } catch (e) {
      ready = undefined;
      throw e;
    }
  };
  const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

  return {
    async upsertGoogleUser(p) {
      await init();
      const d = await users.findOneAndUpdate(
        { sub: p.sub },
        {
          $set: { name: p.name, email: p.email, picture: p.picture },
          $setOnInsert: { favs: [], recent: [], played: [], createdAt: new Date() },
        },
        { upsert: true, returnDocument: "after" },
      );
      return userOf(d!);
    },
    async getUser(id) {
      const _id = oid(id);
      if (!_id) return null;
      await init();
      const d = await users.findOne({ _id });
      return d ? userOf(d) : null;
    },
    async setFav(userId, key, on) {
      const _id = oid(userId);
      if (!_id) return;
      if (on) {
        await users.updateOne({ _id }, { $addToSet: { favs: key } });
        // keep the list bounded: drop the oldest beyond the limit
        await users.updateOne({ _id, [`favs.${LIMITS.favs}`]: { $exists: true } }, { $push: { favs: { $each: [], $slice: -LIMITS.favs } } });
      } else await users.updateOne({ _id }, { $pull: { favs: key } });
    },
    async markPlayed(userId, key) {
      const _id = oid(userId);
      if (!_id) return;
      const u = await users.findOne({ _id }, { projection: { recent: 1, played: 1 } });
      if (!u) return;
      const played = (u.played ?? []).includes(key) ? u.played : [...(u.played ?? []), key].slice(-LIMITS.played);
      await users.updateOne({ _id }, { $set: { recent: addFirst(u.recent ?? [], key, LIMITS.recent), played } });
    },
    async listVideos(userId) {
      await init();
      return (await videos.find({ ownerId: userId }).sort({ createdAt: -1 }).toArray()).map(videoOf);
    },
    async getVideo(userId, id) {
      const _id = oid(id);
      const d = _id && (await videos.findOne({ _id, ownerId: userId }));
      return d ? videoOf(d) : null;
    },
    async createVideo(userId, input) {
      const data = validateClip(input);
      await init();
      if ((await videos.countDocuments({ ownerId: userId })) >= LIMITS.videos)
        throw new ClipValidationError({ form: `You can keep up to ${LIMITS.videos} videos.` });
      const now = new Date();
      const { sample: _s, ...rest } = data;
      const doc: VideoDoc = { _id: new ObjectId(), ownerId: userId, ...rest, place: rest.place, createdAt: now, updatedAt: now } as VideoDoc;
      await videos.insertOne(doc);
      return videoOf(doc);
    },
    async updateVideo(userId, id, input) {
      const data = validateClip(input);
      const _id = oid(id);
      if (!_id) throw new Error("Video not found.");
      const { sample: _s, ...rest } = data;
      const d = await videos.findOneAndUpdate({ _id, ownerId: userId }, { $set: { ...rest, updatedAt: new Date() } }, { returnDocument: "after" });
      if (!d) throw new Error("Video not found.");
      return videoOf(d);
    },
    async removeVideo(userId, id) {
      const _id = oid(id);
      if (!_id) return false;
      const ok = (await videos.deleteOne({ _id, ownerId: userId })).deletedCount === 1;
      if (ok) await users.updateOne({ _id: new ObjectId(userId) }, { $pull: { favs: myKey(id), recent: myKey(id), played: myKey(id) } });
      return ok;
    },
  };
}

/* ---------------- Local JSON files (development) ---------------- */

function fileAccounts(): AccountStore {
  const dir = path.join(process.cwd(), ".data");
  const usersFile = path.join(dir, "users.json");
  const videosFile = path.join(dir, "uservideos.json");
  type UserRow = User & { sub: string };
  const read = async <T,>(f: string): Promise<T[]> => {
    try {
      return JSON.parse(await fs.readFile(f, "utf8")) as T[];
    } catch {
      return [];
    }
  };
  const write = async (f: string, v: unknown) => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(f, JSON.stringify(v, null, 2) + "\n");
  };
  const editUser = async (id: string, fn: (u: UserRow) => void) => {
    const all = await read<UserRow>(usersFile);
    const u = all.find((x) => x.id === id);
    if (!u) return;
    fn(u);
    await write(usersFile, all);
  };
  const strip = ({ sub: _sub, ...u }: UserRow): User => u;

  return {
    async upsertGoogleUser(p) {
      const all = await read<UserRow>(usersFile);
      let u = all.find((x) => x.sub === p.sub);
      if (u) Object.assign(u, { name: p.name, email: p.email, picture: p.picture });
      else all.push((u = { id: new ObjectId().toHexString(), sub: p.sub, name: p.name, email: p.email, picture: p.picture, favs: [], recent: [], played: [] }));
      await write(usersFile, all);
      return strip(u);
    },
    async getUser(id) {
      const u = (await read<UserRow>(usersFile)).find((x) => x.id === id);
      return u ? strip(u) : null;
    },
    async setFav(userId, key, on) {
      await editUser(userId, (u) => {
        u.favs = on ? [key, ...u.favs.filter((x) => x !== key)].slice(0, LIMITS.favs) : u.favs.filter((x) => x !== key);
      });
    },
    async markPlayed(userId, key) {
      await editUser(userId, (u) => {
        u.recent = addFirst(u.recent, key, LIMITS.recent);
        if (!u.played.includes(key)) u.played = [...u.played, key].slice(-LIMITS.played);
      });
    },
    async listVideos(userId) {
      return (await read<VideoRow>(videosFile)).filter((r) => r.ownerId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toClip);
    },
    async getVideo(userId, id) {
      const r = (await read<VideoRow>(videosFile)).find((x) => x.id === id && x.ownerId === userId);
      return r ? toClip(r) : null;
    },
    async createVideo(userId, input) {
      const data = validateClip(input);
      const all = await read<VideoRow>(videosFile);
      if (all.filter((r) => r.ownerId === userId).length >= LIMITS.videos)
        throw new ClipValidationError({ form: `You can keep up to ${LIMITS.videos} videos.` });
      const now = new Date().toISOString();
      const { sample: _s, ...rest } = data;
      const row = { id: new ObjectId().toHexString(), ownerId: userId, ...rest, createdAt: now, updatedAt: now } as VideoRow;
      await write(videosFile, [row, ...all]);
      return toClip(row);
    },
    async updateVideo(userId, id, input) {
      const data = validateClip(input);
      const all = await read<VideoRow>(videosFile);
      const i = all.findIndex((x) => x.id === id && x.ownerId === userId);
      if (i < 0) throw new Error("Video not found.");
      const { sample: _s, ...rest } = data;
      all[i] = { ...all[i], ...rest, updatedAt: new Date().toISOString() };
      await write(videosFile, all);
      return toClip(all[i]);
    },
    async removeVideo(userId, id) {
      const all = await read<VideoRow>(videosFile);
      const left = all.filter((x) => !(x.id === id && x.ownerId === userId));
      if (left.length === all.length) return false;
      await write(videosFile, left);
      await editUser(userId, (u) => {
        const k = myKey(id);
        u.favs = u.favs.filter((x) => x !== k);
        u.recent = u.recent.filter((x) => x !== k);
        u.played = u.played.filter((x) => x !== k);
      });
      return true;
    },
  };
}

let accounts: AccountStore | undefined;
let pending: Promise<AccountStore> | undefined;

/** Lazily picks Mongo or files. */
export function getAccounts(): AccountStore {
  if (accounts) return accounts;
  // Resolve the database on first use; every method awaits it.
  const lazy = <K extends keyof AccountStore>(k: K) =>
    (async (...args: unknown[]) => {
      pending ??= getMongoDb()
        .then((db) => (accounts = db ? mongoAccounts(db) : fileAccounts()))
        .catch((e) => {
          pending = undefined; // a failed connection is never kept
          throw e;
        });
      const real = await pending;
      return (real[k] as (...a: unknown[]) => unknown)(...args);
    }) as AccountStore[K];
  return {
    upsertGoogleUser: lazy("upsertGoogleUser"),
    getUser: lazy("getUser"),
    setFav: lazy("setFav"),
    markPlayed: lazy("markPlayed"),
    listVideos: lazy("listVideos"),
    getVideo: lazy("getVideo"),
    createVideo: lazy("createVideo"),
    updateVideo: lazy("updateVideo"),
    removeVideo: lazy("removeVideo"),
  };
}
