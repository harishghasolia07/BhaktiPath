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
