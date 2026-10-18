// Presentation helpers shared by server and client components.
import type { Clip } from "./clip-schema";
import { kathaKey, kathaOf, type KathaSource } from "./katha";

/** "Day - 5 | Shrimad Bhagwat Katha … - Dhuri - P.B 2026" -> "Day 5 · Dhuri 2026" */
export function sourceLabel(src: string | KathaSource): string {
  const s: KathaSource = typeof src === "string" ? { videoTitle: src } : src;
  const videoTitle = s.videoTitle;
  if (!videoTitle && !s.place) return "Katha";
  const k = kathaOf(s);
  const where = [k.place, k.year].filter(Boolean).join(" ");
  if (k.day && where) return `Day ${k.day} · ${where}`;
  if (where) return k.name ? `${k.name} · ${where}` : where;
  return videoTitle.length > 48 ? `${videoTitle.slice(0, 46)}…` : videoTitle || "Katha";
}

/** A clip's own page: public clips live under /clip, a person's own videos under /my. */
export function clipHref(c: Pick<Clip, "owner" | "id" | "slug">): string {
  return c.owner ? `/my/${c.id}` : `/clip/${c.slug}`;
}

/** Where the katha library shows this video's clips. */
export function libraryHref(src: KathaSource, videoId: string): string {
  const k = kathaOf(src);
  const p = new URLSearchParams({ k: kathaKey(k, videoId) });
  if (k.day) p.set("d", String(k.day));
  return `/kathas?${p}`;
}

export type ClipGroup = { videoId: string; label: string; href: string; clips: Clip[] };

/** Clips grouped by katha day (newest day first), each day in time order. */
export function groupByVideo(clips: Clip[]): ClipGroup[] {
  const groups = new Map<string, ClipGroup & { newest: string }>();
  for (const c of clips) {
    const g = groups.get(c.videoId);
    if (g) {
      g.clips.push(c);
      if (c.createdAt > g.newest) g.newest = c.createdAt;
    } else {
      groups.set(c.videoId, {
        videoId: c.videoId,
        label: sourceLabel(c),
        href: libraryHref(c, c.videoId),
        clips: [c],
        newest: c.createdAt,
      });
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.newest.localeCompare(a.newest))
    .map(({ videoId, label, href, clips }) => ({ videoId, label, href, clips: clips.sort((a, b) => a.start - b.start) }));
}

/** The order clips play in when "autoplay next" is on: board order. */
export function boardOrder(clips: Clip[]): Clip[] {
  return groupByVideo(clips).flatMap((g) => g.clips);
}

/** Text that is mostly Devanagari gets lang="hi" so it is shaped and read correctly. */
export function langOf(text: string): "hi" | undefined {
  return /[ऀ-ॿ]/.test(text) ? "hi" : undefined;
}
