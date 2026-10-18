// Hindi auto-captions of a YouTube video, via yt-dlp (only the caption text is downloaded, never the video).
// Node only. Cached in .data/captions so a video is fetched once.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseVtt, type CapEvent } from "./finder";

export function fetchCaptions(videoId: string, cacheDir = join(".data", "captions")): CapEvent[] {
  const cached = join(cacheDir, `${videoId}.hi.vtt`);
  if (!existsSync(cached)) {
    const dir = mkdtempSync(join(tmpdir(), "caps-"));
    try {
      execFileSync(
        "yt-dlp",
        ["--no-cache-dir", "--skip-download", "--write-auto-subs", "--sub-langs", "hi", "--sub-format", "vtt", "-o", join(dir, "%(id)s"), `https://www.youtube.com/watch?v=${videoId}`],
        { stdio: ["ignore", "ignore", "ignore"], timeout: 170_000 },
      );
    } catch {
      throw new Error(`yt-dlp couldn't fetch the captions of ${videoId} (is yt-dlp installed? does the video have Hindi auto-captions?)`);
    }
    const file = readdirSync(dir).find((f) => f.endsWith(".vtt"));
    if (!file) throw new Error(`${videoId} has no Hindi auto-captions`);
    mkdirSync(cacheDir, { recursive: true });
    copyFileSync(join(dir, file), cached);
  }
  return parseVtt(readFileSync(cached, "utf8"));
}
