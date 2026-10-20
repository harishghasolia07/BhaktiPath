// Which katha a clip belongs to, read from the source video's YouTube title.
// The BhaktiPath channel titles its streams like
//   "Day - 5 | Shrimad Bhagwat Katha Live With Shri Indresh Ji Maharaj - Dhuri - P.B 2026"
//   "Day - 3 | Shri Bhakt Maal Katha Live With Shri Indresh Ji Maharaj - Sirsa - HR 2026"
//   "Day - 2 | Shrimad Bhagwat Katha Live With … - Tiroda - Gondia - M.H 2026"
import type { Clip } from "./clip-schema";

const STATES: Record<string, string> = {
  PB: "Punjab",
  RJ: "Rajasthan",
  HR: "Haryana",
  CG: "Chhattisgarh",
  MH: "Maharashtra",
  UP: "Uttar Pradesh",
  MP: "Madhya Pradesh",
  DL: "Delhi",
  GJ: "Gujarat",
  UK: "Uttarakhand",
  HP: "Himachal Pradesh",
  BR: "Bihar",
  JH: "Jharkhand",
  WB: "West Bengal",
  OD: "Odisha",
  AS: "Assam",
  KA: "Karnataka",
  TN: "Tamil Nadu",
  TS: "Telangana",
  AP: "Andhra Pradesh",
  CH: "Chandigarh",
  JK: "Jammu & Kashmir",
  GA: "Goa",
  KL: "Kerala",
};

export type KathaInfo = {
  /** e.g. "Shrimad Bhagwat Katha", "Shri Bhakt Maal Katha" */
  name: string;
  /** e.g. "Dhuri", "Tiroda, Gondia" */
  place: string;
  /** e.g. "Punjab" (or the raw code when unknown) */
  region: string;
  year: number | null;
  day: number | null;
};

export function parseKatha(videoTitle: string): KathaInfo {
  const t = (videoTitle ?? "").replace(/\s+/g, " ").trim();
  const day = Number(t.match(/\bday\s*[-:]?\s*(\d{1,2})\b/i)?.[1]) || null;
  const year = Number(t.match(/\b(20\d\d)\b/)?.[1]) || null;

  // The katha's name sits between "Day - N |" and "Live With"/"With".
  const afterDay = t.replace(/^day\s*[-:]?\s*\d+\s*\|\s*/i, "");
  const name = (afterDay.match(/^(.*?)\s+(?:live\s+)?with\b/i)?.[1] ?? "").trim();

  // Place segments follow "Maharaj"; the last segment is "<state> <year>".
  let place = "";
  let region = "";
  const tail = t.split(/maharaj/i)[1];
  if (tail) {
    const parts = tail
      .split(/\s+-\s+|\s+-|-\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts.pop() ?? "";
    const code = last.replace(/\b20\d\d\b/, "").replace(/[^A-Za-z]/g, "").toUpperCase();
    region = STATES[code] ?? last.replace(/\b20\d\d\b/, "").trim();
    place = parts.join(", ");
  }
  return { name, place, region, year, day };
}

/** What identifies a clip's katha: the video's title, with optional per-clip overrides. */
export type KathaSource = { videoTitle: string; place?: string; day?: number | null };

/** parseKatha, with the place/day an editor typed in taking priority over the title. */
export function kathaOf(src: KathaSource): KathaInfo {
  const k = parseKatha(src.videoTitle);
  const place = src.place?.trim();
  return {
    ...k,
    place: place || k.place,
    region: place ? "" : k.region,
    day: src.day ?? k.day,
  };
}

export type Katha = KathaInfo & { day: null } & {
  key: string;
  /** "Dhuri, Punjab" */
  label: string;
  clips: Clip[];
  days: number[];
  /** video used as the katha's picture */
  coverVideoId: string;
  newest: string;
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function kathaKey(info: KathaInfo, fallback: string): string {
  if (!info.place) return `video-${fallback.toLowerCase()}`;
  return slug([info.place, info.year, info.name.replace(/^shri(mad)?\s+/i, "")].filter(Boolean).join(" "));
}

/** One entry per katha (place + year + katha name), newest first; clips by day then time. */
export function groupByKatha(clips: Clip[]): Katha[] {
  const map = new Map<string, Katha>();
  for (const c of clips) {
    const info = kathaOf(c);
    const key = kathaKey(info, c.videoId);
    let k = map.get(key);
    if (!k) {
      const label = info.place ? [info.place, info.region].filter(Boolean).join(", ") : c.videoTitle || "Other videos";
      k = { ...info, day: null, key, label, clips: [], days: [], coverVideoId: c.videoId, newest: c.createdAt };
      map.set(key, k);
    }
    k.clips.push(c);
    if (info.day && !k.days.includes(info.day)) k.days.push(info.day);
    if (c.createdAt > k.newest) k.newest = c.createdAt;
  }
  return [...map.values()]
    .map((k) => ({
      ...k,
      days: k.days.sort((a, b) => a - b),
      clips: k.clips.sort(
        (a, b) => (kathaOf(a).day ?? 0) - (kathaOf(b).day ?? 0) || a.start - b.start,
      ),
    }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.newest.localeCompare(a.newest));
}

export function dayRange(days: number[]): string {
  if (!days.length) return "";
  if (days.length === 1) return `Day ${days[0]}`;
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  return contiguous ? `Days ${days[0]}–${days[days.length - 1]}` : `Days ${days.join(", ")}`;
}

/**
 * The order "play next" follows for a clip: the rest of its own katha first (by day, then time),
 * then the same section in the other kathas, newest katha first. The current clip stays in the list;
 * callers take what comes after it, wrapping round to the start.
 */
export function kathaQueue(clips: Clip[], current: Clip): Clip[] {
  const same = clips.filter((c) => c.categories.some((x) => current.categories.includes(x))); // shares a section
  const pool = same.some((c) => c.slug === current.slug) ? same : [current, ...same];
  const mine = kathaKey(kathaOf(current), current.videoId);
  const kathas = groupByKatha(pool);
  const own = kathas.filter((k) => k.key === mine);
  const rest = kathas.filter((k) => k.key !== mine);
  return [...own, ...rest].flatMap((k) => k.clips);
}
