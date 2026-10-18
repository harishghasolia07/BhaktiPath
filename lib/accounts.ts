// People who signed in with Google, what they keep (likes, recently played) and the YouTube
// videos they add for themselves. MongoDB when MONGODB_URI is set, otherwise local JSON files.
import { promises as fs } from "node:fs";
import path from "node:path";
import { ObjectId, type Db } from "mongodb";
import { normCategory, type Clip, type ClipInput } from "./clip-schema";
import { PLAYLIST_LIMITS, type Playlist } from "./playlists";
import { nextSubmission, type Submission } from "./submission";
import { ClipValidationError, getMongoDb, validateClip } from "./store";

export type User = {
  id: string;
  name: string;
  email: string;
  picture: string;
  /** Google accounts count as verified; password accounts once they open the emailed link. */
  verified: boolean;
  favs: string[];
  recent: string[];
  played: string[];
};

export type GoogleProfile = { sub: string; name: string; email: string; picture: string };

export type Credentials = { id: string; email: string; name: string; passwordHash: string | null; lockedUntil: number; lastMail: Record<MailKind, number>; verified: boolean };
export type MailKind = "verify" | "reset";

export class AccountError extends Error {
  constructor(public readonly code: "exists" | "google-only") {
    super(code);
  }
}

/** Wrong passwords allowed before an account pauses sign-in, and for how long. */
export const LOCKOUT = { attempts: 5, minutes: 10 } as const;

const normEmail = (e: string) => e.trim().toLowerCase();

export const LIMITS = { favs: 500, recent: 30, played: 2000, videos: 200 } as const;

export interface AccountStore {
  /** Signs a Google profile in. An existing account with the same email is linked (and loses any password). */
  upsertGoogleUser(p: GoogleProfile): Promise<User>;
  /** A new email-and-password account. Throws AccountError("exists") if the email is taken. */
  createPasswordUser(p: { name: string; email: string; passwordHash: string }): Promise<User>;
  getCredentials(email: string): Promise<Credentials | null>;
  getCredentialsById(id: string): Promise<Credentials | null>;
  markVerified(userId: string): Promise<void>;
  /** Sets a new password; also verifies the email (they just proved they own it) and clears any lockout. */
  setPassword(userId: string, passwordHash: string): Promise<void>;
  /** Remembers when an email was last sent to this person (to limit how often). */
  touchMail(userId: string, kind: MailKind): Promise<void>;
  recordFailure(userId: string): Promise<void>;
  clearFailures(userId: string): Promise<void>;
  getUser(id: string): Promise<User | null>;
  setFav(userId: string, key: string, on: boolean): Promise<void>;
  markPlayed(userId: string, key: string): Promise<void>;
  listVideos(userId: string): Promise<Clip[]>;
  getVideo(userId: string, id: string): Promise<Clip | null>;
  /** `wantsPublic`: offer it to the public collection (the admin approves it first). */
  createVideo(userId: string, input: ClipInput, wantsPublic?: boolean): Promise<Clip>;
  /** `wantsPublic` undefined leaves the submission as it is. */
  updateVideo(userId: string, id: string, input: ClipInput, wantsPublic?: boolean): Promise<Clip>;
  /** Admin: videos waiting for approval (oldest first), with who sent them. */
  listPending(): Promise<{ video: Clip; by: { name: string; email: string } }[]>;
  /** Admin: any person's video by id. */
  getVideoAny(id: string): Promise<Clip | null>;
  /** Admin: approve (with the public clip's slug) or reject a pending video. False if it wasn't pending. */
  reviewVideo(id: string, decision: "approved" | "rejected", publishedSlug?: string): Promise<boolean>;
  removeVideo(userId: string, id: string): Promise<boolean>;
  listPlaylists(userId: string): Promise<Playlist[]>;
  /** Any person's playlist by id (the caller decides who may see it). */
  getPlaylist(id: string): Promise<Playlist | null>;
  createPlaylist(userId: string, name: string): Promise<Playlist>;
  /** Changes only the owner's own playlist; null if it isn't theirs. */
  savePlaylist(userId: string, id: string, patch: { name?: string; public?: boolean; items?: string[] }): Promise<Playlist | null>;
  deletePlaylist(userId: string, id: string): Promise<boolean>;
  /** Removes the person and everything they kept (videos, likes, history). */
  deleteUser(userId: string): Promise<void>;
  /** For the admin backup: people (no passwords) and their videos. */
  exportAll(): Promise<{ users: User[]; videos: Clip[]; playlists: Playlist[] }>;
}

/** Likes and play history use "my-<id>" for a person's own videos and the clip slug for the public ones. */
export const myKey = (id: string) => `my-${id}`;

type VideoRow = Omit<Clip, "id" | "owner" | "slug" | "submission"> & { id: string; ownerId: string; submission?: Submission | null; publishedSlug?: string };
/** Only the clip's own fields: never database internals such as Mongo's _id. */
const toClip = (r: VideoRow): Clip => ({
  id: r.id,
  slug: myKey(r.id),
  owner: r.ownerId,
  submission: r.submission ?? null,
  title: r.title,
  videoId: r.videoId,
  start: r.start,
  end: r.end,
  category: normCategory(r.category),
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

type UserDoc = { _id: ObjectId; sub?: string; name: string; email: string; picture: string; passwordHash?: string; verified?: boolean; lastMail?: Partial<Record<MailKind, Date>>; failed?: number; lockedUntil?: Date; favs: string[]; recent: string[]; played: string[]; createdAt: Date };
type VideoDoc = Omit<VideoRow, "id" | "createdAt" | "updatedAt"> & { _id: ObjectId; createdAt: Date; updatedAt: Date };

const credOf = (d: UserDoc): Credentials => ({
  id: d._id.toHexString(),
  email: d.email,
  name: d.name,
  passwordHash: d.passwordHash ?? null,
  lockedUntil: d.lockedUntil?.getTime() ?? 0,
  lastMail: { verify: d.lastMail?.verify?.getTime() ?? 0, reset: d.lastMail?.reset?.getTime() ?? 0 },
  verified: Boolean(d.sub) || Boolean(d.verified),
});

type PlaylistDoc = Omit<Playlist, "id" | "createdAt" | "updatedAt"> & { _id: ObjectId; createdAt: Date; updatedAt: Date };
const listOf = (d: PlaylistDoc): Playlist => ({
  id: d._id.toHexString(),
  ownerId: d.ownerId,
  name: d.name,
  items: d.items ?? [],
  public: Boolean(d.public),
  createdAt: d.createdAt.toISOString(),
  updatedAt: d.updatedAt.toISOString(),
});

const userOf = (d: UserDoc): User => ({
  id: d._id.toHexString(),
  name: d.name,
  email: d.email,
  picture: d.picture,
  verified: Boolean(d.sub) || Boolean(d.verified),
  favs: d.favs ?? [],
  recent: d.recent ?? [],
  played: d.played ?? [],
});
const videoOf = (d: VideoDoc): Clip =>
  toClip({ ...d, id: d._id.toHexString(), createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() });

function mongoAccounts(db: Db): AccountStore {
  const users = db.collection<UserDoc>("users");
  const videos = db.collection<VideoDoc>("uservideos");
  const lists = db.collection<PlaylistDoc>("playlists");
  let ready: Promise<unknown> | undefined;
  const init = async () => {
    ready ??= (async () => {
      // Password accounts have no Google id, so its unique index must only cover accounts that have one.
      const old = (await users.indexes().catch(() => [])).find((i) => i.name === "sub_1");
      if (old && !old.partialFilterExpression) await users.dropIndex("sub_1");
      await Promise.all([
        users.createIndex({ sub: 1 }, { unique: true, partialFilterExpression: { sub: { $type: "string" } } }),
        users.createIndex({ email: 1 }, { unique: true }),
        videos.createIndex({ ownerId: 1, createdAt: -1 }),
        lists.createIndex({ ownerId: 1, createdAt: 1 }),
      ]);
    })();
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
      const email = normEmail(p.email);
      const found = (await users.findOne({ sub: p.sub })) ?? (await users.findOne({ email }));
      if (found) {
        // Same person, proved by Google: link it, and drop any password someone set for this email before.
        const d = await users.findOneAndUpdate(
          { _id: found._id },
          { $set: { sub: p.sub, email, picture: p.picture, ...(found.sub ? {} : { name: p.name }) }, $unset: { passwordHash: "", failed: "", lockedUntil: "" } },
          { returnDocument: "after" },
        );
        return userOf(d!);
      }
      const doc: UserDoc = { _id: new ObjectId(), sub: p.sub, name: p.name, email, picture: p.picture, favs: [], recent: [], played: [], createdAt: new Date() };
      await users.insertOne(doc);
      return userOf(doc);
    },
    async createPasswordUser(p) {
      await init();
      const email = normEmail(p.email);
      const doc: UserDoc = { _id: new ObjectId(), name: p.name, email, picture: "", passwordHash: p.passwordHash, favs: [], recent: [], played: [], createdAt: new Date() };
      try {
        await users.insertOne(doc);
      } catch (e) {
        if ((e as { code?: number }).code === 11000) {
          const other = await users.findOne({ email }, { projection: { passwordHash: 1 } });
          throw new AccountError(other?.passwordHash ? "exists" : "google-only");
        }
        throw e;
      }
      return userOf(doc);
    },
    async getCredentials(email) {
      await init();
      const d = await users.findOne({ email: normEmail(email) });
      return d ? credOf(d) : null;
    },
    async getCredentialsById(id) {
      const _id = oid(id);
      if (!_id) return null;
      await init();
      const d = await users.findOne({ _id });
      return d ? credOf(d) : null;
    },
    async markVerified(userId) {
      const _id = oid(userId);
      if (_id) await users.updateOne({ _id }, { $set: { verified: true } });
    },
    async setPassword(userId, passwordHash) {
      const _id = oid(userId);
      if (_id) await users.updateOne({ _id }, { $set: { passwordHash, verified: true, failed: 0 }, $unset: { lockedUntil: "" } });
    },
    async touchMail(userId, kind) {
      const _id = oid(userId);
      if (_id) await users.updateOne({ _id }, { $set: { [`lastMail.${kind}`]: new Date() } });
    },
    async recordFailure(userId) {
      const _id = oid(userId);
      if (!_id) return;
      const d = await users.findOneAndUpdate({ _id }, { $inc: { failed: 1 } }, { returnDocument: "after" });
      if (d && (d.failed ?? 0) >= LOCKOUT.attempts)
        await users.updateOne({ _id }, { $set: { failed: 0, lockedUntil: new Date(Date.now() + LOCKOUT.minutes * 60_000) } });
    },
    async clearFailures(userId) {
      const _id = oid(userId);
      if (_id) await users.updateOne({ _id }, { $set: { failed: 0 }, $unset: { lockedUntil: "" } });
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
    async createVideo(userId, input, wantsPublic = false) {
      const data = validateClip(input);
      await init();
      if ((await videos.countDocuments({ ownerId: userId })) >= LIMITS.videos)
        throw new ClipValidationError({ form: `You can keep up to ${LIMITS.videos} videos.` });
      const now = new Date();
      const { sample: _s, ...rest } = data;
      const doc: VideoDoc = { _id: new ObjectId(), ownerId: userId, ...rest, place: rest.place, submission: nextSubmission(null, wantsPublic), createdAt: now, updatedAt: now } as VideoDoc;
      await videos.insertOne(doc);
      return videoOf(doc);
    },
    async updateVideo(userId, id, input, wantsPublic) {
      const data = validateClip(input);
      const _id = oid(id);
      if (!_id) throw new Error("Video not found.");
      const old = await videos.findOne({ _id, ownerId: userId });
      if (!old) throw new Error("Video not found.");
      const { sample: _s, ...rest } = data;
      const submission = wantsPublic === undefined ? (old.submission ?? null) : nextSubmission(old.submission, wantsPublic);
      const d = await videos.findOneAndUpdate({ _id, ownerId: userId }, { $set: { ...rest, submission, updatedAt: new Date() } }, { returnDocument: "after" });
      if (!d) throw new Error("Video not found.");
      return videoOf(d);
    },
    async listPending() {
      await init();
      const pending = await videos.find({ submission: "pending" }).sort({ createdAt: 1 }).toArray();
      const owners = await users.find({ _id: { $in: [...new Set(pending.map((p) => p.ownerId))].filter((x) => ObjectId.isValid(x)).map((x) => new ObjectId(x)) } }).toArray();
      const by = new Map(owners.map((u) => [u._id.toHexString(), { name: u.name, email: u.email }]));
      return pending.map((p) => ({ video: videoOf(p), by: by.get(p.ownerId) ?? { name: "(deleted)", email: "" } }));
    },
    async getVideoAny(id) {
      const _id = oid(id);
      const d = _id && (await videos.findOne({ _id }));
      return d ? videoOf(d) : null;
    },
    async reviewVideo(id, decision, publishedSlug) {
      const _id = oid(id);
      if (!_id) return false;
      const r = await videos.updateOne({ _id, submission: "pending" }, { $set: { submission: decision, ...(publishedSlug ? { publishedSlug } : {}), updatedAt: new Date() } });
      return r.modifiedCount === 1;
    },
    async listPlaylists(userId) {
      await init();
      return (await lists.find({ ownerId: userId }).sort({ createdAt: 1 }).toArray()).map(listOf);
    },
    async getPlaylist(id) {
      const _id = oid(id);
      const d = _id && (await lists.findOne({ _id }));
      return d ? listOf(d) : null;
    },
    async createPlaylist(userId, name) {
      await init();
      if ((await lists.countDocuments({ ownerId: userId })) >= PLAYLIST_LIMITS.playlists)
        throw new Error(`You can keep up to ${PLAYLIST_LIMITS.playlists} playlists.`);
      const now = new Date();
      const doc: PlaylistDoc = { _id: new ObjectId(), ownerId: userId, name, items: [], public: false, createdAt: now, updatedAt: now };
      await lists.insertOne(doc);
      return listOf(doc);
    },
    async savePlaylist(userId, id, patch) {
      const _id = oid(id);
      if (!_id) return null;
      const d = await lists.findOneAndUpdate({ _id, ownerId: userId }, { $set: { ...patch, updatedAt: new Date() } }, { returnDocument: "after" });
      return d ? listOf(d) : null;
    },
    async deletePlaylist(userId, id) {
      const _id = oid(id);
      return _id ? (await lists.deleteOne({ _id, ownerId: userId })).deletedCount === 1 : false;
    },
    async deleteUser(userId) {
      const _id = oid(userId);
      if (!_id) return;
      await videos.deleteMany({ ownerId: userId });
      await lists.deleteMany({ ownerId: userId });
      await users.deleteOne({ _id });
    },
    async exportAll() {
      await init();
      const [u, v, l] = await Promise.all([users.find({}).toArray(), videos.find({}).toArray(), lists.find({}).toArray()]);
      return { users: u.map(userOf), videos: v.map(videoOf), playlists: l.map(listOf) };
    },
    async removeVideo(userId, id) {
      const _id = oid(id);
      if (!_id) return false;
      const ok = (await videos.deleteOne({ _id, ownerId: userId })).deletedCount === 1;
      if (ok) {
        await users.updateOne({ _id: new ObjectId(userId) }, { $pull: { favs: myKey(id), recent: myKey(id), played: myKey(id) } });
        await lists.updateMany({ ownerId: userId }, { $pull: { items: myKey(id) } });
      }
      return ok;
    },
  };
}

/* ---------------- Local JSON files (development) ---------------- */

function fileAccounts(): AccountStore {
  const dir = path.join(process.cwd(), ".data");
  const usersFile = path.join(dir, "users.json");
  const videosFile = path.join(dir, "uservideos.json");
  const listsFile = path.join(dir, "playlists.json");
  type UserRow = User & { sub?: string; passwordHash?: string; failed?: number; lockedUntil?: number; lastMail?: Partial<Record<MailKind, number>> };
  const cred = (u: UserRow): Credentials => ({ id: u.id, email: u.email, name: u.name, passwordHash: u.passwordHash ?? null, lockedUntil: u.lockedUntil ?? 0, lastMail: { verify: u.lastMail?.verify ?? 0, reset: u.lastMail?.reset ?? 0 }, verified: Boolean(u.sub) || u.verified });
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
  const strip = ({ sub: _sub, passwordHash: _h, failed: _f, lockedUntil: _l, lastMail: _m, ...u }: UserRow): User => ({ ...u, verified: Boolean(_sub) || Boolean(u.verified) });

  return {
    async upsertGoogleUser(p) {
      const all = await read<UserRow>(usersFile);
      const email = normEmail(p.email);
      let u = all.find((x) => x.sub === p.sub) ?? all.find((x) => x.email === email);
      if (u) {
        const linking = !u.sub;
        Object.assign(u, { sub: p.sub, email, picture: p.picture, ...(linking ? { name: p.name } : {}) });
        delete u.passwordHash, delete u.failed, delete u.lockedUntil;
      } else all.push((u = { id: new ObjectId().toHexString(), sub: p.sub, name: p.name, email, picture: p.picture, verified: true, favs: [], recent: [], played: [] }));
      await write(usersFile, all);
      return strip(u);
    },
    async createPasswordUser(p) {
      const all = await read<UserRow>(usersFile);
      const email = normEmail(p.email);
      const other = all.find((x) => x.email === email);
      if (other) throw new AccountError(other.passwordHash ? "exists" : "google-only");
      const u: UserRow = { id: new ObjectId().toHexString(), name: p.name, email, picture: "", verified: false, passwordHash: p.passwordHash, favs: [], recent: [], played: [] };
      await write(usersFile, [...all, u]);
      return strip(u);
    },
    async getCredentials(email) {
      const u = (await read<UserRow>(usersFile)).find((x) => x.email === normEmail(email));
      return u ? cred(u) : null;
    },
    async getCredentialsById(id) {
      const u = (await read<UserRow>(usersFile)).find((x) => x.id === id);
      return u ? cred(u) : null;
    },
    async markVerified(userId) {
      await editUser(userId, (u) => {
        u.verified = true;
      });
    },
    async setPassword(userId, passwordHash) {
      await editUser(userId, (u) => {
        Object.assign(u, { passwordHash, verified: true, failed: 0 });
        delete u.lockedUntil;
      });
    },
    async touchMail(userId, kind) {
      await editUser(userId, (u) => {
        u.lastMail = { ...u.lastMail, [kind]: Date.now() };
      });
    },
    async recordFailure(userId) {
      await editUser(userId, (u) => {
        u.failed = (u.failed ?? 0) + 1;
        if (u.failed >= LOCKOUT.attempts) Object.assign(u, { failed: 0, lockedUntil: Date.now() + LOCKOUT.minutes * 60_000 });
      });
    },
    async clearFailures(userId) {
      await editUser(userId, (u) => {
        u.failed = 0;
        delete u.lockedUntil;
      });
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
    async createVideo(userId, input, wantsPublic = false) {
      const data = validateClip(input);
      const all = await read<VideoRow>(videosFile);
      if (all.filter((r) => r.ownerId === userId).length >= LIMITS.videos)
        throw new ClipValidationError({ form: `You can keep up to ${LIMITS.videos} videos.` });
      const now = new Date().toISOString();
      const { sample: _s, ...rest } = data;
      const row = { id: new ObjectId().toHexString(), ownerId: userId, ...rest, submission: nextSubmission(null, wantsPublic), createdAt: now, updatedAt: now } as VideoRow;
      await write(videosFile, [row, ...all]);
      return toClip(row);
    },
    async updateVideo(userId, id, input, wantsPublic) {
      const data = validateClip(input);
      const all = await read<VideoRow>(videosFile);
      const i = all.findIndex((x) => x.id === id && x.ownerId === userId);
      if (i < 0) throw new Error("Video not found.");
      const { sample: _s, ...rest } = data;
      const submission = wantsPublic === undefined ? (all[i].submission ?? null) : nextSubmission(all[i].submission, wantsPublic);
      all[i] = { ...all[i], ...rest, submission, updatedAt: new Date().toISOString() };
      await write(videosFile, all);
      return toClip(all[i]);
    },
    async listPending() {
      const users = await read<UserRow>(usersFile);
      return (await read<VideoRow>(videosFile))
        .filter((r) => r.submission === "pending")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((r) => {
          const u = users.find((x) => x.id === r.ownerId);
          return { video: toClip(r), by: u ? { name: u.name, email: u.email } : { name: "(deleted)", email: "" } };
        });
    },
    async getVideoAny(id) {
      const r = (await read<VideoRow>(videosFile)).find((x) => x.id === id);
      return r ? toClip(r) : null;
    },
    async reviewVideo(id, decision, publishedSlug) {
      const all = await read<VideoRow>(videosFile);
      const r = all.find((x) => x.id === id && x.submission === "pending");
      if (!r) return false;
      Object.assign(r, { submission: decision, ...(publishedSlug ? { publishedSlug } : {}), updatedAt: new Date().toISOString() });
      await write(videosFile, all);
      return true;
    },
    async listPlaylists(userId) {
      return (await read<Playlist>(listsFile)).filter((l) => l.ownerId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async getPlaylist(id) {
      return (await read<Playlist>(listsFile)).find((l) => l.id === id) ?? null;
    },
    async createPlaylist(userId, name) {
      const all = await read<Playlist>(listsFile);
      if (all.filter((l) => l.ownerId === userId).length >= PLAYLIST_LIMITS.playlists) throw new Error(`You can keep up to ${PLAYLIST_LIMITS.playlists} playlists.`);
      const now = new Date().toISOString();
      const l: Playlist = { id: new ObjectId().toHexString(), ownerId: userId, name, items: [], public: false, createdAt: now, updatedAt: now };
      await write(listsFile, [...all, l]);
      return l;
    },
    async savePlaylist(userId, id, patch) {
      const all = await read<Playlist>(listsFile);
      const l = all.find((x) => x.id === id && x.ownerId === userId);
      if (!l) return null;
      Object.assign(l, patch, { updatedAt: new Date().toISOString() });
      await write(listsFile, all);
      return l;
    },
    async deletePlaylist(userId, id) {
      const all = await read<Playlist>(listsFile);
      const left = all.filter((x) => !(x.id === id && x.ownerId === userId));
      if (left.length === all.length) return false;
      await write(listsFile, left);
      return true;
    },
    async deleteUser(userId) {
      await write(videosFile, (await read<VideoRow>(videosFile)).filter((r) => r.ownerId !== userId));
      await write(listsFile, (await read<Playlist>(listsFile)).filter((l) => l.ownerId !== userId));
      await write(usersFile, (await read<UserRow>(usersFile)).filter((u) => u.id !== userId));
    },
    async exportAll() {
      return { users: (await read<UserRow>(usersFile)).map(strip), videos: (await read<VideoRow>(videosFile)).map(toClip), playlists: await read<Playlist>(listsFile) };
    },
    async removeVideo(userId, id) {
      const all = await read<VideoRow>(videosFile);
      const left = all.filter((x) => !(x.id === id && x.ownerId === userId));
      if (left.length === all.length) return false;
      await write(videosFile, left);
      await write(listsFile, (await read<Playlist>(listsFile)).map((l) => (l.ownerId === userId ? { ...l, items: l.items.filter((k) => k !== myKey(id)) } : l)));
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
    createPasswordUser: lazy("createPasswordUser"),
    getCredentials: lazy("getCredentials"),
    getCredentialsById: lazy("getCredentialsById"),
    markVerified: lazy("markVerified"),
    setPassword: lazy("setPassword"),
    touchMail: lazy("touchMail"),
    recordFailure: lazy("recordFailure"),
    clearFailures: lazy("clearFailures"),
    getUser: lazy("getUser"),
    setFav: lazy("setFav"),
    markPlayed: lazy("markPlayed"),
    listVideos: lazy("listVideos"),
    getVideo: lazy("getVideo"),
    createVideo: lazy("createVideo"),
    updateVideo: lazy("updateVideo"),
    listPending: lazy("listPending"),
    getVideoAny: lazy("getVideoAny"),
    reviewVideo: lazy("reviewVideo"),
    removeVideo: lazy("removeVideo"),
    deleteUser: lazy("deleteUser"),
    exportAll: lazy("exportAll"),
    listPlaylists: lazy("listPlaylists"),
    getPlaylist: lazy("getPlaylist"),
    createPlaylist: lazy("createPlaylist"),
    savePlaylist: lazy("savePlaylist"),
    deletePlaylist: lazy("deletePlaylist"),
  };
}
