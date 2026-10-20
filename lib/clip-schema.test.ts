import { describe, expect, it } from "vitest";
import { catsOf, clipInputSchema, makeSlug, parseTags, sectionsText } from "./clip-schema";
import { groupByVideo, langOf, sourceLabel } from "./display";
import type { Clip } from "./clip-schema";

const base = { title: "Radhe Radhe Japo", videoId: "fH2lNOThsV0", start: "21:31", end: "30:45", categories: ["kirtan"] };

describe("sections", () => {
  it("a clip is in one, two or three sections, kept in the usual order without repeats", () => {
    expect(clipInputSchema.parse({ ...base, categories: ["kirtan"] }).categories).toEqual(["kirtan"]);
    expect(clipInputSchema.parse({ ...base, categories: ["katha", "kirtan", "kirtan"] }).categories).toEqual(["kirtan", "katha"]);
    expect(clipInputSchema.parse({ ...base, categories: ["katha", "kirtan", "bhajan"] }).categories).toEqual(["bhajan", "kirtan", "katha"]);
  });
  it("still takes the older single `category`", () => {
    const { categories: _c, ...noCats } = base;
    expect(clipInputSchema.parse({ ...noCats, category: "katha" }).categories).toEqual(["katha"]);
  });
  it("needs at least one real section", () => {
    const r = clipInputSchema.safeParse({ ...base, categories: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["categories"]);
    expect(clipInputSchema.safeParse({ ...base, categories: ["film"] }).success).toBe(false);
  });
  it("reads clips saved before: their 'bhajan' and 'kirtan' are Kirtan", () => {
    expect([{ category: "bhajan" }, { category: "kirtan" }, { category: "katha" }, {}].map(catsOf)).toEqual([["kirtan"], ["kirtan"], ["katha"], ["kirtan"]]);
    expect(catsOf({ categories: ["katha", "bhajan"], category: "bhajan" })).toEqual(["bhajan", "katha"]);
  });
  it("names the sections for people", () => {
    expect(sectionsText({ categories: ["bhajan", "kirtan"] })).toBe("Bhajan · Kirtan");
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
    expect(clipInputSchema.safeParse({ ...base, categories: ["film"] }).success).toBe(false);
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
