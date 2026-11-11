// Put the owner's exact lyrics in place of YouTube's auto-captions, for one clip.
//
//   npm run lyrics:set -- data/lyrics/<slug>.json
//
// The file:
//   {
//     "slug": "shri-radha-kripa-kataksh-stotram",
//     "videoId": "tjuOcC7B9jk",
//     "start": 2778,                  // optional: must match the clip
//     "end": 3791,                    // optional: must match the clip
//     "lines": [
//       { "t": 2802.24, "text": "मुनीन्द्रवृन्दवन्दिते …", "translit": "Munīndra-vṛnda-vandite …", "verse": 1 },
//       …
//     ]
//   }
//
// `t` is seconds into the video, in order; `translit` is shown under the line; `verse` is shown above the first
// line of a verse. Once saved the caption generator leaves these lyrics alone (`npm run lyrics` prints
// "kept the exact lyrics" and moves on). Saving refreshes the site.
//
// Reads MONGODB_URI from .env.local (without it, the local .data/lyrics.json is used).
import { existsSync, readFileSync } from "node:fs";
import type { LyricLine } from "../lib/lyrics";
import { saveLyrics } from "../lib/lyrics-store";
import { getStore } from "../lib/store";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

type LyricsFile = {
  slug: string;
  videoId: string;
  start?: number;
  end?: number;
  lines: LyricLine[];
};

const die = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

async function refreshSite() {
  const secret = process.env.REVALIDATE_SECRET;
  for (const site of [process.env.SITE_URL, "http://localhost:3100"]) {
    if (!site || !secret) continue;
    try {
      const r = await fetch(`${site.replace(/\/$/, "")}/api/revalidate`, { method: "POST", headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(20_000) });
      console.log(r.ok ? `site refreshed: ${site}` : `! refresh failed for ${site} (${r.status})`);
    } catch {
      console.log(`  (couldn't reach ${site}: skipped)`);
    }
  }
}

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? die("usage: npm run lyrics:set -- data/lyrics/<slug>.json");
  if (!existsSync(file)) die(`no such file: ${file}`);
  const doc = JSON.parse(readFileSync(file, "utf8")) as LyricsFile;

  if (!doc.slug || !doc.videoId) die("the file needs a slug and a videoId");
  const clip = (await getStore().getBySlug(doc.slug)) ?? die(`no clip with slug "${doc.slug}"`);
  if (clip.videoId !== doc.videoId) die(`the clip is on video ${clip.videoId}, the file says ${doc.videoId}`);
  if (doc.start !== undefined && doc.start !== clip.start) die(`the clip starts at ${clip.start}s, the file says ${doc.start}s`);
  if (doc.end !== undefined && doc.end !== clip.end) die(`the clip ends at ${clip.end}s, the file says ${doc.end}s`);

  if (!Array.isArray(doc.lines) || doc.lines.length === 0) die("the file has no lines");
  let last = -Infinity;
  const verses = new Set<number>();
  doc.lines.forEach((l, i) => {
    const n = i + 1;
    if (typeof l.t !== "number" || !Number.isFinite(l.t)) die(`line ${n}: t must be a number of seconds`);
    if (l.t < clip.start - 0.5 || l.t > clip.end + 0.5) die(`line ${n}: ${l.t}s is outside the clip (${clip.start}–${clip.end})`);
    if (l.t <= last) die(`line ${n}: times must go forward (${last}s → ${l.t}s)`);
    last = l.t;
    if (typeof l.text !== "string" || !l.text.trim()) die(`line ${n}: text is empty`);
    if (l.translit !== undefined && typeof l.translit !== "string") die(`line ${n}: translit must be a string`);
    if (l.verse !== undefined) {
      if (!Number.isInteger(l.verse) || l.verse < 1) die(`line ${n}: verse must be a whole number from 1`);
      verses.add(l.verse);
    }
    l.spoken = false;
  });

  await saveLyrics(
    { slug: clip.slug, videoId: clip.videoId, start: clip.start, end: clip.end, lines: doc.lines },
    "manual",
  );

  const first = doc.lines[0].t;
  const withTranslit = doc.lines.filter((l) => l.translit).length;
  console.log(`✓ exact lyrics for "${clip.title}" [${clip.slug}]`);
  console.log(`  ${doc.lines.length} lines${verses.size ? `, ${verses.size} verses` : ""}${withTranslit ? `, ${withTranslit} with transliteration` : ""}`);
  console.log(`  ${first}s – ${last}s (clip ${clip.start}–${clip.end})`);
  await refreshSite();
  process.exit(0);
}

main().catch((e) => die((e as Error).message));
