// Finds likely bhajans in a long katha video from YouTube's auto-generated captions.
// The captions mark music as "[संगीत]" and singing as "[गाना गाने की आवाज़]"; stretches where those
// markers keep coming are suggested as clips. Pure functions, so they can be tested with fixture text.

export type CapEvent = { t: number; text: string };

export type Segment = {
  start: number;
  end: number;
  /** how many music/singing markers fell inside */
  markers: number;
  /** first sung lines, to recognise the bhajan by */
  hint: string;
};

const MARKER = /\[(संगीत|गाना गाने की आवाज़|गायन|Music|Singing)\]|♪/;

const toSec = (s: string) => {
  const [h, m, x] = s.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(x);
};

/** YouTube's rolling WebVTT: every cue repeats the previous line, so keep only lines that are new. */
export function parseVtt(vtt: string): CapEvent[] {
  const cues = [...vtt.matchAll(/(\d+:\d+:\d+\.\d+) --> (\d+:\d+:\d+\.\d+)[^\n]*\n([\s\S]*?)(?=\n\n|$)/g)].map((m) => ({
    t: toSec(m[1]),
    lines: m[3]
      .split("\n")
      .map((l) => l.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean),
  }));
  const events: CapEvent[] = [];
  let prev = new Set<string>();
  for (const c of cues) {
    for (const l of c.lines) if (!prev.has(l)) events.push({ t: c.t, text: l });
    prev = new Set(c.lines);
  }
  return events;
}

export type FindOptions = {
  /** seconds of silence between markers that still count as one bhajan (verses, pauses) */
  gap?: number;
  /** shortest clip worth suggesting, in seconds */
  minLength?: number;
  /** minimum markers in a segment */
  minMarkers?: number;
  /** seconds added before the first marker (the first sung words come before it) and after the last */
  lead?: number;
  tail?: number;
};

export function findSegments(events: CapEvent[], opts: FindOptions = {}): Segment[] {
  const { gap = 90, minLength = 120, minMarkers = 5, lead = 40, tail = 20 } = opts;
  const marks = events.filter((e) => MARKER.test(e.text)).map((e) => e.t);
  if (!marks.length) return [];

  const runs: number[][] = [[marks[0]]];
  for (const t of marks.slice(1)) {
    const run = runs[runs.length - 1];
    if (t - run[run.length - 1] <= gap) run.push(t);
    else runs.push([t]);
  }

  const out: Segment[] = [];
  for (const run of runs) {
    const start = Math.max(0, Math.floor((run[0] - lead) / 5) * 5);
    const end = Math.ceil((run[run.length - 1] + tail) / 5) * 5;
    if (run.length < minMarkers || end - start < minLength) continue;
    const lines = events.filter((e) => e.t >= start && e.t <= end && !MARKER.test(e.text) && e.text.split(/\s+/).length <= 6);
    const clean = lines.map((l) => l.text.replace(/\s*\[[^\]]*\]\s*/g, "").trim()).filter(Boolean);
    const distinct = new Set(clean);
    const hint = [...distinct].slice(0, 3).join(" / ");
    out.push({
      start,
      end,
      markers: run.length,
      hint,
    });
  }
  return out;
}
