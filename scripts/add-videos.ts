// Add new bhajans from the owner's notes, always the same way.
//
//   npm run add-videos -- plan notes.txt [--direct]   read the notes, check them against the video captions,
//                                                      write the plan to .data/add-plan.json and print what was heard
//   npm run add-videos -- save [plan.json]            save the plan's clips to the database and refresh the site
//
// The notes look like:
//   day 1 - https://www.youtube.com/watch?v=XXXXXXXXXXX
//   15:30 - 26:50 - hey gopal radhe krishna govind govind
//   2:24:18 - mix - man bhul mat jaaio radha rani ke charan, radhe radhe govind govind radhe
//
// plan: names are tidied (capital letters, spacing); the exact times are used as given. A missing end is found from
//       the captions; a missing start is reported (it can't be guessed). Mixes list what the captions say. Clips that
//       are already in the collection (same video, overlapping or within a minute) are flagged and skipped.
// Then the plan's titles are corrected by hand from the captions (spelling, grammar) and `save` is run.
// --direct: save straight away when the plan has no problems and no duplicates.
//
// Reads MONGODB_URI from .env.local (without it, the local .data/clips.json is used).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { parseNotes } from "../lib/addnotes";
import { findDuplicates, type Dupable } from "../lib/duplicates";
import type { Category } from "../lib/clip-schema";
import { evidenceFor, guessEnd, singingResumes, type Heard } from "../lib/evidence";
import { makeLyrics } from "../lib/make-lyrics";
import { fetchVideoTitle } from "../lib/oembed";
import { ClipValidationError, getStore, validateClip } from "../lib/store";
import { tidyTitle } from "../lib/tidy";
import { fetchCaptions } from "../lib/ytdlp";
import { formatLength, formatTime } from "../lib/youtube";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PLAN = ".data/add-plan.json";
const die = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

type PlanClip = {
  videoId: string;
  videoTitle: string;
  start: number | null;
  end: number | null;
  endGuessed: boolean;
  /** corrected by hand before saving */
  title: string;
  mix: boolean;
  /** what the notes said, for reference */
  given: string;
  /** one to three of bhajan, kirtan, katha (edit in the plan before saving) */
  categories: Category[];
  /** things to look at; saving is stopped while there are problems */
  problems: string[];
  warnings: string[];
  duplicates: { reason: string; title: string; slug?: string }[];
  /** save it even though it looks like a duplicate */
  allowDuplicate: boolean;
  /** leave this one out */
  skip: boolean;
  heard: { first: string[]; last: string[]; samples: string[] };
};

const at = (h: Heard) => `${formatTime(h.t)} ${h.text}`;

async function plan(notesPath: string, direct: boolean) {
  const text = notesPath === "-" ? readFileSync(0, "utf8") : existsSync(notesPath) ? readFileSync(notesPath, "utf8") : die(`no such file: ${notesPath}`);
  const { videos, errors } = parseNotes(text);
  if (errors.length) die(`I couldn't read the notes:\n  ${errors.join("\n  ")}`);
  if (!videos.length) die("no video links in the notes");

  const store = getStore();
  const existing: Dupable[] = (await store.list()).map((c) => ({ videoId: c.videoId, start: c.start, end: c.end, title: c.title, slug: c.slug }));
  const batch: Dupable[] = [];
  const clips: PlanClip[] = [];

  for (const v of videos) {
    console.log(`\n━━ ${v.label || "video"}  ${v.videoId}`);
    const videoTitle = await fetchVideoTitle(v.videoId);
    console.log(`   ${videoTitle || "(no title)"}`);
    let events: ReturnType<typeof fetchCaptions> = [];
    try {
      events = fetchCaptions(v.videoId);
    } catch (err) {
      console.log(`   ! ${(err as Error).message}: names and times can't be checked`);
    }
    for (const n of v.clips) {
      const problems: string[] = [];
      const warnings: string[] = [];
      let end = n.end;
      let endGuessed = false;
      if (n.start === null) problems.push("no start time");
      if (end === null && n.start !== null) {
        const g = events.length ? guessEnd(events, n.start) : null;
        if (g !== null) {
          end = g;
          endGuessed = true;
          warnings.push(`no end time given: I took ${formatTime(g)}, where the singing stops. Check it.`);
          const again = singingResumes(events, g);
          if (again !== null) warnings.push(`singing starts again at ${formatTime(again)}: the real end may be later (a talk in between?)`);
        } else problems.push("no end time, and I couldn't find where the singing stops");
      }
      if (n.start !== null && end !== null && end <= n.start) problems.push("the end is not after the start");
      const title = tidyTitle(n.name, n.mix);
      if (n.mix && title !== "Mix" && n.name.split(/[\s,+]+/).filter(Boolean).length < 2) warnings.push("the mix has only one word of names: list what is sung (see 'heard')");
      if (!title || title === "Mix") problems.push(n.mix ? "a mix with no names: list what is sung (see 'heard')" : "no name (see 'heard' for the first sung lines)");
      const ev = events.length && n.start !== null && end !== null ? evidenceFor(events, n.start, end, n.mix) : { first: [], last: [], samples: [], markers: 0, warnings: [] };
      warnings.push(...ev.warnings);
      const cand = n.start !== null && end !== null ? { videoId: v.videoId, start: n.start, end, title } : null;
      const duplicates = cand ? findDuplicates(cand, [...existing, ...batch]).map((d) => ({ reason: d.reason, title: d.with.title, slug: d.with.slug })) : [];
      if (cand) batch.push(cand);
      clips.push({
        videoId: v.videoId,
        videoTitle,
        start: n.start,
        end,
        endGuessed,
        title,
        mix: n.mix,
        given: n.name,
        categories: ["kirtan"],
        problems,
        warnings,
        duplicates,
        allowDuplicate: false,
        skip: false,
        heard: { first: ev.first.map(at), last: ev.last.map(at), samples: ev.samples.map(at) },
      });
      // ---- show it
      const range = n.start !== null && end !== null ? `${formatTime(n.start)} – ${formatTime(end)} (${formatLength(end - n.start)})` : `${n.start !== null ? formatTime(n.start) : "?"} – ?`;
      console.log(`\n  #${clips.length}  ${range}${n.mix ? "  [mix]" : ""}`);
      console.log(`      title: ${title || "(none)"}${n.name && title !== n.name ? `     (notes said: ${n.name})` : ""}`);
      const h = clips[clips.length - 1].heard;
      if (h.first.length) console.log(`      starts: ${h.first.slice(0, 4).join("  |  ")}`);
      if (h.last.length) console.log(`      ends:   ${h.last.slice(-3).join("  |  ")}`);
      if (h.samples.length) console.log(`      heard:\n${h.samples.map((s) => `        ${s}`).join("\n")}`);
      for (const p of problems) console.log(`      ✗ ${p}`);
      for (const w of warnings) console.log(`      ⚠ ${w}`);
      for (const d of duplicates) console.log(`      ⚠ already in the collection (${d.reason}): "${d.title}"`);
    }
  }

  mkdirSync(".data", { recursive: true });
  writeFileSync(PLAN, JSON.stringify({ createdAt: new Date().toISOString(), clips }, null, 2) + "\n");
  const bad = clips.filter((c) => c.problems.length).length;
  const dup = clips.filter((c) => c.duplicates.length).length;
  console.log(`\n${clips.length} clips planned → ${PLAN}   (${bad} with problems, ${dup} look like duplicates)`);
  if (direct && !bad && !dup) return save(PLAN);
  if (direct) console.log("--direct stopped: fix the problems / duplicates first.");
  console.log("Next: correct the titles in the plan from what was heard, then:  npm run add-videos -- save");
}

async function save(file: string) {
  if (!existsSync(file)) die(`no plan at ${file}: run  npm run add-videos -- plan notes.txt  first`);
  const { clips } = JSON.parse(readFileSync(file, "utf8")) as { clips: PlanClip[] };
  const store = getStore();
  const existing: Dupable[] = (await store.list()).map((c) => ({ videoId: c.videoId, start: c.start, end: c.end, title: c.title, slug: c.slug }));

  const todo = clips.filter((c) => !c.skip);
  const stop: string[] = [];
  const fresh: Dupable[] = [];
  const toSave: PlanClip[] = [];
  const skippedDup: string[] = [];
  todo.forEach((c, i) => {
    const label = `#${clips.indexOf(c) + 1} "${c.title}"`;
    if (c.problems.length) return void stop.push(`${label}: ${c.problems.join("; ")}`);
    if (c.start === null || c.end === null) return void stop.push(`${label}: missing times`);
    const dups = findDuplicates({ videoId: c.videoId, start: c.start, end: c.end, title: c.title }, [...existing, ...fresh]);
    if (dups.length && !c.allowDuplicate) return void skippedDup.push(`${label}: already there (${dups[0].reason}: "${dups[0].with.title}")`);
    try {
      validateClip({ title: c.title, videoId: c.videoId, start: c.start, end: c.end, categories: c.categories, videoTitle: c.videoTitle });
    } catch (err) {
      return void stop.push(`${label}: ${err instanceof ClipValidationError ? Object.values(err.issues).join(" ") : (err as Error).message}`);
    }
    fresh.push({ videoId: c.videoId, start: c.start, end: c.end, title: c.title });
    toSave.push(c);
    void i;
  });
  if (stop.length) die(`nothing saved. Fix these first:\n  ${stop.join("\n  ")}`);

  console.log(`store: ${store.kind} | before: ${existing.length} clips`);
  const added = [];
  for (const c of toSave) {
    const made = await store.create({ title: c.title, videoId: c.videoId, start: c.start!, end: c.end!, categories: c.categories, videoTitle: c.videoTitle });
    added.push(made);
    console.log(`+ ${`${formatTime(made.start)}–${formatTime(made.end)}`.padEnd(17)} ${made.title}  [${made.slug}]`);
  }
  if (added.length) {
    console.log("synced lyrics from the captions:");
    await makeLyrics(added, { log: console.log });
  }
  for (const s of skippedDup) console.log(`- skipped ${s}`);
  console.log(`after: ${(await store.list()).length} clips (${toSave.length} added, ${skippedDup.length} skipped as duplicates)`);

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
  renameSync(file, file.replace(/\.json$/, `.done-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.json`));
}

const [cmd, arg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const direct = process.argv.includes("--direct");
(cmd === "plan" ? plan(arg ?? die("usage: npm run add-videos -- plan <notes.txt|->"), direct) : cmd === "save" ? save(arg ?? PLAN) : Promise.resolve(die("usage: npm run add-videos -- plan <notes.txt> [--direct]   |   save [plan.json]"))).then(
  () => process.exit(0),
  (err) => die((err as Error).message),
);
