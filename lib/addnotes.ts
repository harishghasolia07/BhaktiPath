// Reads the owner's notes for new videos, the way they are written in chat:
//   day 1 - https://www.youtube.com/watch?v=XXXXXXXXXXX
//   15:30 - 26:50 - hey gopal radhe krishna govind govind
//   2:24:18 - mix - man bhul mat jaaio radha rani ke charan, radhe radhe govind govind radhe
// A video line starts a block; each clip line has a start, usually an end, and a name (or "mix" and some names).
import { parseTime, parseVideoId } from "./youtube";

export type NoteClip = {
  line: number;
  raw: string;
  start: number | null;
  /** null when the notes give only a start */
  end: number | null;
  /** what was written after the times, without a leading "mix" */
  name: string;
  /** the notes say this part holds more than one bhajan */
  mix: boolean;
};
export type NoteVideo = { videoId: string; label: string; clips: NoteClip[] };

const URL_RE = /https?:\/\/\S*(?:youtu\.be|youtube\.com)\S*/i;
const TIME = String.raw`\d{1,2}(?::\d{2}){1,2}`;
const DASH = String.raw`\s*[-–—]\s*`;
const START_RE = new RegExp(`^${"(" + TIME + ")"}(?:${DASH}(.*))?$`);
const END_RE = new RegExp(`^(${TIME})(?:${DASH}(.*))?$`);

export function parseNotes(text: string): { videos: NoteVideo[]; errors: string[] } {
  const videos: NoteVideo[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const n = i + 1;
    const line = rawLine.replace(/^[\s*•\-–—]+/, "").trim();
    if (!line) return;
    const url = line.match(URL_RE)?.[0];
    if (url) {
      const videoId = parseVideoId(url);
      if (!videoId) return void errors.push(`line ${n}: "${url}" isn't a YouTube video link`);
      videos.push({ videoId, label: line.slice(0, line.indexOf(url)).replace(/[\s\-–—:]+$/, "").trim(), clips: [] });
      return;
    }
    const current = videos[videos.length - 1];
    if (!current) return void errors.push(`line ${n}: there is no video link above "${line.slice(0, 40)}"`);
    const m = line.match(START_RE);
    if (!m) return void errors.push(`line ${n}: couldn't find a start time in "${line.slice(0, 50)}" (write it like 15:30 - 26:50 - name)`);
    const start = parseTime(m[1]);
    let rest = (m[2] ?? "").trim();
    let end: number | null = null;
    const e = rest.match(END_RE);
    if (e) {
      end = parseTime(e[1]);
      rest = (e[2] ?? "").trim();
    }
    const mix = /\bmix\b/i.test(rest);
    const name = rest.replace(/^mix\b[\s\-–—:]*/i, "").trim();
    current.clips.push({ line: n, raw: line, start, end, name, mix });
  });
  return { videos, errors };
}
