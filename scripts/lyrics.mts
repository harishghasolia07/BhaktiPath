// Synced lyrics for the public clips, from YouTube's automatic Hindi captions.
//   npm run lyrics                 make lyrics for clips that have none (or whose times changed)
//   npm run lyrics -- --force      remake them all
//   npm run lyrics -- <slug> ...   only these clips
// `npm run add-videos -- save` does this by itself for the clips it adds.
import { existsSync } from "node:fs";
import { makeLyrics } from "../lib/make-lyrics";
import { getStore } from "../lib/store";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const slugs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const all = await getStore().list();
const clips = slugs.length ? all.filter((c) => slugs.includes(c.slug)) : all;
console.log(`${clips.length} clips`);
const made = await makeLyrics(clips, { force: process.argv.includes("--force") || slugs.length > 0, log: console.log });
console.log(`${made} made`);
process.exit(0);
