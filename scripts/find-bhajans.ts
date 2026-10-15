// Suggests where the bhajans are in a long katha video, from YouTube's auto-generated Hindi captions.
//
//   npm run find -- <youtube link>                       show suggested bhajans
//   npm run find -- <link> --gap 120 --min 90            tune: pause allowed inside one bhajan / shortest clip (seconds)
//   npm run find -- <link> --add "1=Radhe Radhe Japo,3=Govind Bolo"
//                                                        save suggestions 1 and 3 with those names
//
// Needs yt-dlp. Only the caption text is downloaded, never the video.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTags } from "../lib/clip-schema";
import { findSegments, parseVtt } from "../lib/finder";
import { fetchVideoTitle } from "../lib/oembed";
import { getStore } from "../lib/store";
import { formatLength, formatTime, parseVideoId } from "../lib/youtube";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const flag = (n: string) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : undefined);
const die = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

async function main() {
  const link = process.argv.slice(2).find((a) => !a.startsWith("--") && parseVideoId(a));
  const id = (link && parseVideoId(link)) || die("give a YouTube link: npm run find -- <link>");
  const dir = mkdtempSync(join(tmpdir(), "find-"));

  try {
    execFileSync(
      "yt-dlp",
      ["--no-cache-dir", "--skip-download", "--write-auto-subs", "--sub-langs", "hi", "--sub-format", "vtt", "-o", join(dir, "%(id)s"), `https://www.youtube.com/watch?v=${id}`],
      { stdio: ["ignore", "ignore", "ignore"], timeout: 170_000 },
    );
  } catch {
    die("yt-dlp couldn't fetch the captions (is yt-dlp installed? does the video have Hindi auto-captions?)");
  }
  const file = readdirSync(dir).find((f) => f.endsWith(".vtt")) ?? die("this video has no Hindi auto-captions");
  const events = parseVtt(readFileSync(join(dir, file), "utf8"));

  const num = (n: string) => (flag(n) ? Number(flag(n)) : undefined);
  const segs = findSegments(events, { gap: num("gap"), minLength: num("min"), minMarkers: num("markers"), lead: num("lead"), tail: num("tail") });
  const videoTitle = await fetchVideoTitle(id);

  console.log(`\n${videoTitle || id}\n${segs.length} suggested bhajan${segs.length === 1 ? "" : "s"} (from ${events.length} caption lines)\n`);
  console.log("  #  start – end            length   guess   sung words");
  segs.forEach((s, i) => {
    console.log(
      `${String(i + 1).padStart(3)}  ${`${formatTime(s.start)} – ${formatTime(s.end)}`.padEnd(20)} ${formatLength(s.end - s.start).padEnd(8)} ${s.guess.padEnd(7)} ${s.hint}`,
    );
  });

  const add = flag("add");
  if (add) {
    const store = getStore();
    for (const part of add.split(",")) {
      const [n, ...name] = part.split("=");
      const seg = segs[Number(n) - 1] ?? die(`no suggestion #${n}`);
      const title = name.join("=").trim() || die(`give suggestion #${n} a name: --add "${n}=Bhajan name"`);
      const clip = await store.create({
        title,
        videoId: id,
        start: seg.start,
        end: seg.end,
        category: (flag("category") as "bhajan" | "kirtan" | "katha") ?? seg.guess,
        tags: parseTags(flag("tags") ?? ""),
        videoTitle,
      });
      console.log(`✓ added: ${clip.title} (${formatTime(clip.start)} – ${formatTime(clip.end)})`);
    }
    console.log("Run the site's refresh with: npm run clip -- list   (new clips appear after the next refresh)");
  } else if (segs.length) {
    console.log('\nTrim the times in the admin page, or save as they are:  --add "1=Bhajan name,2=Another name"');
  }
}

main().then(
  () => process.exit(0),
  (err) => die((err as Error).message),
);
