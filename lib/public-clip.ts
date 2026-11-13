// Public copies of clips carry no real video times. `start` becomes 0, `end` becomes the clip's
// length, and `rank` keeps its place inside the source video. The player asks the server for the
// real start/end only when a signed-in person is about to play one clip (app/api/play/[slug]).
import type { Clip } from "./clip-schema";

/** Hide one clip's times. Already-public clips are returned as they are. */
export function publicClip(c: Clip, rank = 0): Clip {
  if (c.rank !== undefined) return c;
  return { ...c, start: 0, end: c.end - c.start, rank };
}

/** Hide every clip's times, ranking clips inside each source video in their real time order. */
export function publicClips(clips: Clip[]): Clip[] {
  const byVideo = new Map<string, Clip[]>();
  for (const c of clips) {
    const list = byVideo.get(c.videoId);
    if (list) list.push(c);
    else byVideo.set(c.videoId, [c]);
  }
  const ranks = new Map<string, number>();
  for (const list of byVideo.values()) {
    list.sort((a, b) => a.start - b.start);
    list.forEach((c, i) => ranks.set(c.id, i));
  }
  return clips.map((c) => publicClip(c, ranks.get(c.id) ?? 0));
}
