// Manage clips from the terminal.
//
//   npm run clip -- add --url "https://www.youtube.com/live/fH2lNOThsV0?t=1291" \
//        --title "Radhe Radhe Japo" --start 21:31 --end 30:45 --categories kirtan,bhajan [--tags "Radha, Holi"]
//   npm run clip -- list
//   npm run clip -- remove <slug>
//   npm run clip -- export [file]          (JSON backup; Atlas's free tier has no backups)
//   npm run clip -- import <file>          (adds every clip in a JSON export)
//   npm run clip -- clear-samples          (removes the sample clips)
//
// Reads MONGODB_URI from .env.local (without it, the local .data/clips.json is used).
// After a change it asks the site to refresh: SITE_URL + REVALIDATE_SECRET from .env.local.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CATEGORIES, parseTags, type Category, type Clip } from "../lib/clip-schema";
import { fetchVideoTitle } from "../lib/oembed";
import { ClipValidationError, getStore } from "../lib/store";
import { formatTime, parseVideoId, startFromUrl } from "../lib/youtube";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function die(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function refreshSite() {
  const site = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret) {
    console.log("  (SITE_URL / REVALIDATE_SECRET not set: the site refreshes on its own within 30 days, or on the next admin save)");
    return;
  }
  try {
    const res = await fetch(`${site.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    console.log(res.ok ? `  site refreshed: ${site}` : `  ! site refresh failed (${res.status})`);
  } catch (err) {
    console.log(`  ! couldn't reach ${site}: ${(err as Error).message}`);
  }
}

function line(c: Clip) {
  return `${c.categories.join("+").padEnd(13)} ${`${formatTime(c.start)}-${formatTime(c.end)}`.padEnd(17)} ${c.title}  [${c.slug}]${c.sample ? " (sample)" : ""}`;
}

async function main() {
  const [cmd, arg] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
  const store = getStore();
  console.log(`store: ${store.kind}`);

  switch (cmd) {
    case "add": {
      const url = flag("url") ?? die("--url is required");
      const videoId = parseVideoId(url) ?? die(`no YouTube video ID in "${url}"`);
      const start = flag("start") ?? (startFromUrl(url) !== null ? String(startFromUrl(url)) : die("--start is required"));
      const end = flag("end") ?? die("--end is required");
      const categories = (flag("categories") ?? flag("category") ?? die(`--categories is required (one or more of ${CATEGORIES.join(", ")}, comma separated)`)).split(",").map((s) => s.trim()) as Category[];
      const title = flag("title") ?? die("--title is required");
      const videoTitle = flag("video-title") ?? (await fetchVideoTitle(videoId));
      try {
        const clip = await store.create({
          title,
          videoId,
          start,
          end,
          categories,
          tags: parseTags(flag("tags") ?? ""),
          videoTitle,
          lyrics: flag("lyrics") ?? "",
          place: flag("place") ?? "",
          day: flag("day") ?? "",
          sample: process.argv.includes("--sample"),
        });
        console.log(`✓ added: ${line(clip)}`);
        if (process.env.SITE_URL) console.log(`  ${process.env.SITE_URL.replace(/\/$/, "")}/clip/${clip.slug}`);
      } catch (err) {
        if (err instanceof ClipValidationError) die(Object.values(err.issues).join(" "));
        throw err;
      }
      await refreshSite();
      break;
    }
    case "list": {
      const clips = await store.list();
      for (const c of clips) console.log(line(c));
      console.log(`${clips.length} clip(s)`);
      break;
    }
    case "remove": {
      const slug = arg ?? die("which slug? (see `list`)");
      const clip = (await store.getBySlug(slug)) ?? die(`no clip with slug "${slug}"`);
      await store.remove(clip.id);
      console.log(`✓ removed: ${line(clip)}`);
      await refreshSite();
      break;
    }
    case "clear-samples": {
      const samples = (await store.list()).filter((c) => c.sample);
      for (const c of samples) await store.remove(c.id);
      console.log(`✓ removed ${samples.length} sample clip(s)`);
      await refreshSite();
      break;
    }
    case "export": {
      const file = arg ?? `clips-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const clips = await store.list();
      writeFileSync(file, JSON.stringify(clips, null, 2) + "\n");
      console.log(`✓ ${clips.length} clip(s) written to ${file}`);
      break;
    }
    case "import": {
      const file = arg ?? die("which file?");
      const clips = JSON.parse(readFileSync(file, "utf8")) as Clip[];
      const have = new Set((await store.list()).map((c) => `${c.videoId}:${c.start}:${c.end}`));
      let added = 0;
      for (const c of clips) {
        if (have.has(`${c.videoId}:${c.start}:${c.end}`)) continue;
        await store.create({ ...c, tags: c.tags ?? [] });
        added++;
      }
      console.log(`✓ imported ${added} clip(s), skipped ${clips.length - added} already present`);
      await refreshSite();
      break;
    }
    default:
      console.log("usage: npm run clip -- add|list|remove|export|import|clear-samples  (see scripts/clip.ts)");
      process.exit(cmd ? 1 : 0);
  }
  process.exit(0);
}

main().catch((err) => die((err as Error).message));
