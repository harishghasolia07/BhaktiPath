// Builds and saves synced lyrics for public clips from the videos' Hindi captions. Node only (yt-dlp).
import type { Clip } from "./clip-schema";
import { buildLines } from "./lyrics";
import { lyricsIndex, saveLyrics } from "./lyrics-store";
import { fetchCaptions } from "./ytdlp";

export async function makeLyrics(clips: Clip[], opts: { force?: boolean; log?: (s: string) => void } = {}) {
  const log = opts.log ?? (() => {});
  const have = await lyricsIndex();
  let made = 0;
  for (const c of clips) {
    if (c.owner) continue;
    const old = have.get(c.slug);
    if (!opts.force && old && old.start === c.start && old.end === c.end) continue;
    try {
      const lines = buildLines(fetchCaptions(c.videoId), c.start, c.end);
      await saveLyrics({ slug: c.slug, videoId: c.videoId, start: c.start, end: c.end, lines });
      made++;
      log(`  ♪ ${lines.length.toString().padStart(3)} lines  ${c.title}`);
    } catch (err) {
      log(`  ! no lyrics for ${c.title}: ${(err as Error).message}`);
    }
  }
  return made;
}
