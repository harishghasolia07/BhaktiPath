// Synced lyrics from YouTube's automatic captions: the caption fragments inside a clip, joined into short
// lines with the time each line starts. Pure, so it can be tested; the captions are fetched by the scripts.
import type { CapEvent } from "./finder";

export type LyricLine = {
  /** seconds into the video when the line begins */
  t: number;
  text: string;
  /** a long sentence: most likely speaking between verses, not singing */
  spoken: boolean;
};

const BRACKETS = /\[[^\]]*\]|♪/g;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Fragments closer than `pause` seconds join into one line, up to about `maxChars` characters. */
export function buildLines(events: CapEvent[], start: number, end: number, pause = 2.2, maxChars = 42): LyricLine[] {
  const out: LyricLine[] = [];
  let cur: { t: number; parts: string[]; last: number } | null = null;
  const flush = () => {
    if (!cur) return;
    const text = cur.parts.join(" ").replace(/\s+/g, " ").replace(/\s+([,।?!])/g, "$1").trim();
    if (text && out[out.length - 1]?.text !== text) out.push({ t: cur.t, text, spoken: words(text) >= 9 });
    cur = null;
  };
  for (const e of events) {
    if (e.t < start - 1 || e.t > end) continue;
    const piece = e.text.replace(BRACKETS, " ").replace(/\s+/g, " ").trim();
    if (!piece) {
      flush(); // a music marker ends a line
      continue;
    }
    const length = cur ? cur.parts.join(" ").length + 1 + piece.length : piece.length;
    if (cur && (e.t - cur.last > pause || length > maxChars || /[।?!]$/.test(cur.parts[cur.parts.length - 1]))) flush();
    if (!cur) cur = { t: Math.max(e.t, start), parts: [], last: e.t };
    cur.parts.push(piece);
    cur.last = e.t;
  }
  flush();
  return out;
}

/** The line being sung at `now` (seconds into the video), or -1 before the first line. */
export function activeLine(lines: LyricLine[], now: number): number {
  let i = -1;
  for (let k = 0; k < lines.length && lines[k].t <= now + 0.25; k++) i = k;
  return i;
}
