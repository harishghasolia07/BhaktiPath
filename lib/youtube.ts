// Pure helpers for YouTube links and clip times. No Next.js or Node imports,
// so the CLI scripts, server code and client components can all share them.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Works with watch?v=, /live/, youtu.be/, /embed/, /shorts/ or a bare ID. */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:[?&]v=|\/live\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return ID_RE.test(s) ? s : null;
}

export function isVideoId(id: string): boolean {
  return ID_RE.test(id);
}

/** "21:31", "1:05:20", "1291", "1h05m20s" or "21m31s" -> seconds. */
export function parseTime(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 ? Math.floor(input) : null;
  const s = input.trim().toLowerCase();
  if (s === "") return null;
  if (/^\d+$/.test(s)) return Number(s);
  const hms = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return Number(hms[1] ?? 0) * 3600 + Number(hms[2] ?? 0) * 60 + Number(hms[3] ?? 0);
  }
  const parts = s.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  // minutes and seconds after the first part must be < 60
  if (nums.slice(1).some((n) => n >= 60)) return null;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** seconds -> "21:31" or "1:05:20" */
export function formatTime(total: number): string {
  const t = Math.max(0, Math.floor(total));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Human length for a card: "9 min", "1 hr 4 min", "45 sec". */
export function formatLength(seconds: number): string {
  const t = Math.max(0, Math.round(seconds));
  if (t < 60) return `${t} sec`;
  const h = Math.floor(t / 3600);
  const m = Math.round((t % 3600) / 60);
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** The `t=` value of a pasted link (t=1291, t=1291s, t=21m31s), if any. */
export function startFromUrl(input: string): number | null {
  const m = input.match(/[?&#]t=([0-9hms]+)/i);
  return m ? parseTime(m[1]) : null;
}

export type ThumbSize = "mq" | "hq" | "sd" | "maxres";

/** mq (320x180) and maxres (1280x720) are true 16:9; hq and sd are 4:3 with bars. */
export function thumbnailUrl(videoId: string, size: ThumbSize = "hq"): string {
  const file = size === "maxres" ? "maxresdefault" : `${size}default`;
  return `https://i.ytimg.com/vi/${videoId}/${file}.jpg`;
}

/** Opens YouTube (app on phones) at the clip's start. YouTube cannot stop at an end time. */
export function youtubeAtUrl(videoId: string, start: number): string {
  return `https://youtu.be/${videoId}?t=${Math.floor(start)}`;
}

/** Error codes YouTube's player reports through onError. */
export const PLAYER_ERRORS: Record<number, string> = {
  2: "This clip's video ID or times are invalid.",
  5: "This video can't play in this browser.",
  100: "This video is no longer on YouTube (deleted or made private).",
  101: "The channel doesn't allow this video to play outside YouTube.",
  150: "The channel doesn't allow this video to play outside YouTube.",
  153: "YouTube didn't receive this site's address, so it refused to play. Reload the page.",
};
