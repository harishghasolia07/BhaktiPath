// "link | name | start | end | section" lines -> clips. Pure, so the page preview and the server agree.
import { clipInputSchema, type ClipData } from "./clip-schema";
import { parseVideoId, startFromUrl } from "./youtube";

export type BulkRow = {
  /** 1-based line number in the pasted text */
  line: number;
  raw: string;
  /** set when the line is a valid clip */
  clip?: ClipData;
  /** set when it is not */
  error?: string;
};

const SECTIONS: Record<string, string> = {
  bhajan: "bhajan", "भजन": "bhajan", b: "bhajan", // all mean the Kirtan section (saved as "bhajan")
  kirtan: "bhajan", "कीर्तन": "bhajan", k: "bhajan", // a kirtan is a bhajan
  katha: "katha", "कथा": "katha",
};

export function parseBulk(text: string): BulkRow[] {
  const rows: BulkRow[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(/\s*[|\t]\s*/).map((p) => p.trim());
    const row: BulkRow = { line: i + 1, raw: line };
    rows.push(row);
    if (parts.length < 3) {
      row.error = "Use: link | name | start | end | section";
      return;
    }
    const [link, title] = parts;
    const videoId = parseVideoId(link);
    if (!videoId) {
      row.error = "No YouTube video in that link.";
      return;
    }
    // "link | name | end"  (start taken from the link's t=)  or  "link | name | start | end [| section]"
    const fromLink = startFromUrl(link);
    const withStart = parts.length >= 4;
    const start = withStart ? parts[2] : fromLink !== null ? String(fromLink) : "";
    const end = withStart ? parts[3] : parts[2];
    const sectionText = (withStart ? parts[4] : parts[3]) ?? "bhajan";
    const category = SECTIONS[sectionText.toLowerCase()] ?? SECTIONS[sectionText];
    if (!category) {
      row.error = `Section “${sectionText}” should be bhajan or katha.`;
      return;
    }
    const r = clipInputSchema.safeParse({ title, videoId, start, end, category });
    if (r.success) row.clip = r.data;
    else row.error = r.error.issues[0]?.message ?? "Invalid line.";
  });
  return rows;
}
