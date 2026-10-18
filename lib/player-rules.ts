// The small rules behind the player's queue, repeat and speed, kept free of browser code so they can be tested.

export type Repeat = "off" | "one" | "all";
export const REPEAT_CYCLE: Repeat[] = ["off", "all", "one"];
export const nextRepeat = (r: Repeat): Repeat => REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(r) + 1) % REPEAT_CYCLE.length];

/** The saved repeat mode; an old "repeat this bhajan" switch (sk:loop = 1) counts as "one". */
export function readRepeat(raw: string | null, legacyLoop: string | null): Repeat {
  if (raw === "one" || raw === "all" || raw === "off") return raw;
  return legacyLoop === "1" ? "one" : "off";
}

type Slugged = { slug: string };

/** What to do when a bhajan reaches its end. */
export function afterEnd(o: { repeat: Repeat; autoNext: boolean; list: Slugged[]; slug: string }):
  | { action: "replay" }
  | { action: "goto"; slug: string }
  | { action: "stop" } {
  if (o.repeat === "one") return { action: "replay" };
  const i = o.list.findIndex((x) => x.slug === o.slug);
  const hasNext = i >= 0 && i + 1 < o.list.length;
  if (hasNext && (o.autoNext || o.repeat === "all")) return { action: "goto", slug: o.list[i + 1].slug };
  if (o.repeat === "all") return o.list.length > 1 ? { action: "goto", slug: o.list[0].slug } : { action: "replay" };
  return { action: "stop" };
}

/** The queue with `clip` right after the current bhajan (an earlier copy of it is removed). */
export function insertNext<T extends Slugged>(list: T[], currentSlug: string | undefined, clip: T): T[] {
  const rest = list.filter((x) => x.slug !== clip.slug || x.slug === currentSlug);
  if (clip.slug === currentSlug) return rest;
  const i = rest.findIndex((x) => x.slug === currentSlug);
  return i < 0 ? [...rest, clip] : [...rest.slice(0, i + 1), clip, ...rest.slice(i + 1)];
}

/** The queue with `clip` at the very end (an earlier copy is removed, unless it is the one playing). */
export function appendToQueue<T extends Slugged>(list: T[], currentSlug: string | undefined, clip: T): T[] {
  if (clip.slug === currentSlug) return list;
  return [...list.filter((x) => x.slug !== clip.slug), clip];
}

export const SPEEDS = [1, 1.25, 1.5, 0.75];
export const nextSpeed = (r: number): number => SPEEDS[(Math.max(0, SPEEDS.indexOf(r)) + 1) % SPEEDS.length];
export const readSpeed = (raw: string | null): number => (SPEEDS.includes(Number(raw)) ? Number(raw) : 1);
