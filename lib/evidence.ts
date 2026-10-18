// What the captions say inside a time range, so a bhajan can be named (and a mix listed) from what is sung,
// and so a wrong start or end shows up (a range that begins or ends with someone speaking).
import type { CapEvent } from "./finder";

const BRACKETS = /\[[^\]]*\]|♪/g;
/** the captions' music/singing markers */
const SUNG = /\[(?:संगीत|गाना गाने की आवाज़|गायन|Music|Singing)\]|♪/;
const clean = (t: string) => t.replace(BRACKETS, " ").replace(/\s+/g, " ").trim();
const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;
/** Sung lines are short; running talk has long sentences. */
const looksSpoken = (t: string) => wordCount(t) >= 8;

export type Heard = { t: number; text: string };

export function linesBetween(events: CapEvent[], a: number, b: number): Heard[] {
  const out: Heard[] = [];
  for (const e of events) {
    if (e.t < a || e.t > b) continue;
    const text = clean(e.text);
    if (text && out[out.length - 1]?.text !== text) out.push({ t: e.t, text });
  }
  return out;
}

const share = (lines: Heard[], pred: (t: string) => boolean) => (lines.length ? lines.filter((l) => pred(l.text)).length / lines.length : 0);

export type Evidence = { first: Heard[]; last: Heard[]; samples: Heard[]; markers: number; warnings: string[] };

export function evidenceFor(events: CapEvent[], start: number, end: number, mix: boolean): Evidence {
  const inside = linesBetween(events, start, end);
  const first = linesBetween(events, start, start + 60).slice(0, 6);
  const last = linesBetween(events, Math.max(start, end - 60), end).slice(-5);
  // a mix: one short, sung-looking line about every 45 seconds, to see which bhajans go by
  const samples: Heard[] = [];
  if (mix) {
    for (let t = start; t < end && samples.length < 40; t += 45) {
      const pick = inside.find((l) => l.t >= t && l.t < t + 45 && wordCount(l.text) >= 2 && !looksSpoken(l.text));
      if (pick) samples.push(pick);
    }
  }
  const markers = events.filter((e) => e.t >= start && e.t <= end && SUNG.test(e.text)).length;
  const warnings: string[] = [];
  const lastCaption = events.length ? events[events.length - 1].t : 0;
  if (end > lastCaption + 30) warnings.push("the end is past the last caption: is the time right?");
  if (share(linesBetween(events, start, start + 40), looksSpoken) > 0.5) warnings.push("the start looks like speaking, not singing");
  if (share(linesBetween(events, Math.max(start, end - 40), end), looksSpoken) > 0.5) warnings.push("the end looks like speaking, not singing");
  if (markers < 3) warnings.push("hardly any music or singing in the captions here: is this the right range?");
  return { first, last, samples, markers, warnings };
}

/** When the notes give only a start: where the singing stops (null if there is no singing right after it). */
export function guessEnd(events: CapEvent[], start: number, gap = 90, tail = 15): number | null {
  const marks = events.filter((e) => e.t >= start && SUNG.test(e.text)).map((e) => e.t);
  if (!marks.length || marks[0] - start > 120) return null;
  let last = marks[0];
  for (const t of marks) {
    if (t - last > gap) break;
    last = t;
  }
  return Math.ceil((last + tail) / 5) * 5;
}

/** After a guessed end: when the singing starts again within `within` seconds (null if it doesn't). */
export function singingResumes(events: CapEvent[], after: number, within = 300): number | null {
  const next = events.find((e) => e.t > after && e.t <= after + within && SUNG.test(e.text));
  return next ? next.t : null;
}
