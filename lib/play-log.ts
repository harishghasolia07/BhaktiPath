// One row per clip start, kept for a month. Besides the audit trail, the recent rows are the rate
// limit: an account can start a limited number of clips in a short window, so pulling every curated
// start/end takes many slow, logged requests instead of one page fetch.
import { getMongoDb } from "./store";

export const PLAY_LIMIT = { max: 30, windowMs: 5 * 60_000, retentionSeconds: 30 * 86_400 } as const;

type Play = { userId: string; slug: string; at: Date };
let indexed = false;

async function collection() {
  const db = await getMongoDb();
  if (!db) return null;
  const c = db.collection<Play>("plays");
  if (!indexed) {
    await Promise.all([
      c.createIndex({ userId: 1, at: -1 }),
      c.createIndex({ at: 1 }, { expireAfterSeconds: PLAY_LIMIT.retentionSeconds }),
    ]);
    indexed = true;
  }
  return c;
}

export type PlayGate = { ok: true } | { ok: false; retryAfter: number };

/** Log a start, unless this account has started too many clips in the last few minutes. */
export async function recordPlay(userId: string, slug: string): Promise<PlayGate> {
  const c = await collection();
  if (!c) return { ok: true }; // local file store: no shared counter to enforce
  const now = new Date();
  const since = new Date(now.getTime() - PLAY_LIMIT.windowMs);
  const recent = await c.countDocuments({ userId, at: { $gte: since } });
  if (recent >= PLAY_LIMIT.max) {
    const oldest = await c.find({ userId, at: { $gte: since } }).sort({ at: 1 }).limit(1).next();
    const wait = oldest
      ? (oldest.at.getTime() + PLAY_LIMIT.windowMs - now.getTime()) / 1000
      : PLAY_LIMIT.windowMs / 1000;
    return { ok: false, retryAfter: Math.max(1, Math.ceil(wait)) };
  }
  await c.insertOne({ userId, slug, at: now });
  return { ok: true };
}
