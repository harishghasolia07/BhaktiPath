// "Is this bhajan already in the collection?" Pure, so it can be tested and used by scripts and pages.
import { skeleton } from "./translit";

export type Dupable = { videoId: string; start: number; end: number; title: string; slug?: string };
export type Duplicate = { with: Dupable; reason: "overlap" | "near" | "title" };

/** Seconds apart on the same video that still counts as "the same bhajan, trimmed differently". */
export const NEAR_GAP = 60;

export function findDuplicates(c: Dupable, existing: Dupable[]): Duplicate[] {
  const sk = skeleton(c.title);
  const out: Duplicate[] = [];
  for (const e of existing) {
    if (e === c || (c.slug && e.slug === c.slug)) continue;
    if (e.videoId === c.videoId) {
      if (e.start < c.end && e.end > c.start) out.push({ with: e, reason: "overlap" });
      else if (Math.max(e.start - c.end, c.start - e.end) <= NEAR_GAP) out.push({ with: e, reason: "near" });
    } else if (sk.length >= 6 && skeleton(e.title) === sk) out.push({ with: e, reason: "title" });
  }
  return out;
}

/**
 * For a video someone adds: is (most of) it already there? A match is the same video where at least half of the
 * new range is already covered by one of about the same size, or one that ends/starts within a minute of it.
 * Adding a whole video that merely contains an existing bhajan, or a bhajan cut from a whole video, is not a repeat.
 */
export function findRepeat<T extends Dupable>(c: { videoId: string; start: number; end: number }, existing: T[]): { with: T; reason: "overlap" | "near" } | null {
  const length = Math.max(1, c.end - c.start);
  for (const e of existing) {
    if (e.videoId !== c.videoId) continue;
    const overlap = Math.min(e.end, c.end) - Math.max(e.start, c.start);
    // a repeat covers at least half of the new range, and is about the same size (a short bhajan cut out of a
    // whole video you already have is not a repeat)
    if (overlap > 0 && overlap >= length * 0.5 && e.end - e.start <= length * 2) return { with: e, reason: "overlap" };
    if (overlap <= 0 && Math.max(e.start - c.end, c.start - e.end) <= NEAR_GAP) return { with: e, reason: "near" };
  }
  return null;
}
