// Synced lyrics, one document per public clip (by slug), kept apart from the clips so lists stay small.
// MongoDB collection "lyrics" when MONGODB_URI is set, otherwise .data/lyrics.json. No Next.js imports.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { LyricLine } from "./lyrics";
import { getMongoDb } from "./store";

export type SyncedLyrics = { slug: string; videoId: string; start: number; end: number; lines: LyricLine[]; source: "youtube-auto"; updatedAt: string };

const FILE = () => path.join(process.cwd(), ".data", "lyrics.json");
let indexed = false;

async function col() {
  const db = await getMongoDb();
  if (!db) return null;
  const c = db.collection<SyncedLyrics>("lyrics");
  if (!indexed) {
    await c.createIndex({ slug: 1 }, { unique: true });
    indexed = true;
  }
  return c;
}

async function readFile(): Promise<SyncedLyrics[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf8")) as SyncedLyrics[];
  } catch {
    return [];
  }
}

export async function getLyrics(slug: string): Promise<SyncedLyrics | null> {
  const c = await col();
  if (c) return c.findOne({ slug }, { projection: { _id: 0 } });
  return (await readFile()).find((l) => l.slug === slug) ?? null;
}

export async function saveLyrics(doc: Omit<SyncedLyrics, "updatedAt" | "source">): Promise<void> {
  const full: SyncedLyrics = { ...doc, source: "youtube-auto", updatedAt: new Date().toISOString() };
  const c = await col();
  if (c) {
    await c.replaceOne({ slug: doc.slug }, full, { upsert: true });
    return;
  }
  const all = (await readFile()).filter((l) => l.slug !== doc.slug);
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify([...all, full], null, 2) + "\n");
}

/** Which clips already have lyrics, and for which exact range (a re-timed clip needs new ones). */
export async function lyricsIndex(): Promise<Map<string, { start: number; end: number }>> {
  const c = await col();
  const list = c ? await c.find({}, { projection: { _id: 0, slug: 1, start: 1, end: 1 } }).toArray() : await readFile();
  return new Map(list.map((l) => [l.slug, { start: l.start, end: l.end }]));
}
