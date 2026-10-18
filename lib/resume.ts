// "Continue where I left off" and "New" rules, kept free of browser APIs so they can be tested.
export type Resume = { slug: string; t: number; at: number };

const DAY = 86_400_000;

/** Seconds to resume from, or null when there is nothing worth resuming (too early, nearly over, too old, gone). */
export function resumeOffer(r: Resume | null, clip: { slug: string; start: number; end: number } | undefined, now = Date.now()): number | null {
  if (!r || !clip || r.slug !== clip.slug) return null;
  if (now - r.at > 30 * DAY) return null;
  if (r.t < clip.start + 10 || r.t > clip.end - 10) return null;
  return r.t;
}

/** A clip added after the visitor's previous visit (and only when there is a previous visit). */
export function isNewClip(createdAt: string, since: number): boolean {
  return since > 0 && Date.parse(createdAt) > since;
}
