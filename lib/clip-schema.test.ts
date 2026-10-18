import { describe, expect, it } from "vitest";
import { clipInputSchema, makeSlug, normCategory, parseTags } from "./clip-schema";
import { groupByVideo, langOf, sourceLabel } from "./display";
import type { Clip } from "./clip-schema";

const base = { title: "Radhe Radhe Japo", videoId: "fH2lNOThsV0", start: "21:31", end: "30:45", category: "bhajan" };

describe("sections", () => {
  it("has two sections: a kirtan is a bhajan", () => {
    expect(clipInputSchema.parse({ ...base, category: "kirtan" }).category).toBe("bhajan");
    expect(clipInputSchema.parse({ ...base, category: "katha" }).category).toBe("katha");
    expect(clipInputSchema.safeParse({ ...base, category: "other" }).success).toBe(false);
    expect(["kirtan", "bhajan", undefined, "katha"].map(normCategory)).toEqual(["bhajan", "bhajan", "bhajan", "katha"]);
  });
});

describe("clipInputSchema", () => {
  it("parses times into seconds and fills defaults", () => {
    const c = clipInputSchema.parse(base);
    expect(c).toMatchObject({ start: 1291, end: 1845, tags: [], sample: false, videoTitle: "" });
  });
  it("rejects an end before the start", () => {
    const r = clipInputSchema.safeParse({ ...base, end: "20:00" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["end"]);
  });
  it("rejects a bad ID, time and section", () => {
    expect(clipInputSchema.safeParse({ ...base, videoId: "nope" }).success).toBe(false);
    expect(clipInputSchema.safeParse({ ...base, start: "21:61" }).success).toBe(false);
    expect(clipInputSchema.safeParse({ ...base, category: "film" }).success).toBe(false);
    expect(clipInputSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
  });
  it("dedupes tags", () => {
    expect(clipInputSchema.parse({ ...base, tags: ["Radha", "Radha", "Holi"] }).tags).toEqual(["Radha", "Holi"]);
  });
});

describe("makeSlug", () => {
  it("slugs Hinglish titles", () => {
    expect(makeSlug("Radhe Radhe Japo, Chale Aayenge Bihari!", "fH2lNOThsV0", 1291)).toBe("radhe-radhe-japo-chale-aayenge-bihari");
  });
  it("falls back for Devanagari titles", () => {
    expect(makeSlug("गोविन्द बोलो हरि गोपाल बोलो", "FiGC8c9z-Y8", 3300)).toBe("figc8c9zy8-3300");
  });
  it("parses tags", () => {
    expect(parseTags("Radha, Holi\n Govind ,")).toEqual(["Radha", "Holi", "Govind"]);
  });
});

describe("display", () => {
  it("shortens the katha video title", () => {
    expect(sourceLabel("Day - 5 | Shrimad Bhagwat Katha Live With Shri Indresh Ji Maharaj - Dhuri - P.B 2026")).toBe(
      "Day 5 · Dhuri 2026",
    );
    expect(sourceLabel("")).toBe("Katha");
  });
  it("marks Devanagari text as Hindi", () => {
    expect(langOf("गोविन्द बोलो")).toBe("hi");
    expect(langOf("Govind Bolo")).toBeUndefined();
  });
  it("groups by video, newest day first, clips in time order", () => {
    const mk = (slug: string, videoId: string, start: number, createdAt: string) =>
      ({ slug, videoId, start, end: start + 60, createdAt, videoTitle: "", title: slug }) as Clip;
    const groups = groupByVideo([
      mk("b", "AAAAAAAAAAA", 500, "2026-10-01"),
      mk("a", "AAAAAAAAAAA", 100, "2026-10-02"),
      mk("c", "BBBBBBBBBBB", 50, "2026-10-05"),
    ]);
    expect(groups.map((g) => g.videoId)).toEqual(["BBBBBBBBBBB", "AAAAAAAAAAA"]);
    expect(groups[1].clips.map((c) => c.slug)).toEqual(["a", "b"]);
  });
});
