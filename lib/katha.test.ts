import { describe, expect, it } from "vitest";
import type { Clip } from "./clip-schema";
import { dayRange, groupByKatha, kathaOf, kathaQueue, parseKatha } from "./katha";

const T = (day: number | null, katha: string, tail: string) =>
  `${day ? `Day - ${day} | ` : ""}${katha} Live With Shri Indresh Ji Maharaj - ${tail}`;

describe("parseKatha", () => {
  it("reads day, katha, place, state and year", () => {
    expect(parseKatha(T(5, "Shrimad Bhagwat Katha", "Dhuri - P.B 2026"))).toEqual({
      name: "Shrimad Bhagwat Katha",
      place: "Dhuri",
      region: "Punjab",
      year: 2026,
      day: 5,
    });
  });
  it("handles two-part places and odd spacing", () => {
    expect(parseKatha(T(2, "Shrimad Bhagwat Katha", "Tiroda - Gondia - M.H 2026"))).toMatchObject({
      place: "Tiroda, Gondia",
      region: "Maharashtra",
    });
    expect(parseKatha("Day - 3| Shrimad Bhagwat Katha Live With Shri Indresh Ji Maharaj - Raipur - CG 2026")).toMatchObject({
      day: 3,
      place: "Raipur",
      region: "Chhattisgarh",
    });
  });
  it("handles festival streams without a day, and unknown titles", () => {
    expect(parseKatha(T(null, "Shri Radha Ashtami Mahotsav", "Nagpur - M.H 2026"))).toMatchObject({
      name: "Shri Radha Ashtami Mahotsav",
      place: "Nagpur",
      day: null,
    });
    expect(parseKatha("Some other video")).toMatchObject({ place: "", day: null });
  });
});

describe("groupByKatha", () => {
  const mk = (slug: string, videoTitle: string, start: number, createdAt = "2026-10-01") =>
    ({ slug, videoId: slug.padEnd(11, "x"), videoTitle, start, end: start + 60, createdAt, title: slug, tags: [] }) as unknown as Clip;

  it("groups days of one katha together and keeps different kathas apart", () => {
    const ks = groupByKatha([
      mk("a", T(5, "Shrimad Bhagwat Katha", "Dhuri - P.B 2026"), 900),
      mk("b", T(2, "Shrimad Bhagwat Katha", "Dhuri - P.B 2026"), 100),
      mk("c", T(2, "Shrimad Bhagwat Katha", "Dhuri - P.B 2026"), 50),
      mk("d", T(7, "Shrimad Bhagwat Katha", "Sikar - RJ 2026"), 10),
      mk("e", T(1, "Shri Bhakt Maal Katha", "Sikar - RJ 2026"), 10),
    ]);
    expect(ks.map((k) => k.label)).toEqual(["Dhuri, Punjab", "Sikar, Rajasthan", "Sikar, Rajasthan"]);
    expect(ks[0].days).toEqual([2, 5]);
    expect(ks[0].clips.map((c) => c.slug)).toEqual(["c", "b", "a"]);
    expect(new Set(ks.map((k) => k.key)).size).toBe(3);
  });
  it("describes the days covered", () => {
    expect(dayRange([1, 2, 3])).toBe("Days 1–3");
    expect(dayRange([2, 5])).toBe("Days 2, 5");
    expect(dayRange([4])).toBe("Day 4");
  });
});

describe("kathaOf overrides", () => {
  it("lets an editor's place and day win over the title", () => {
    const title = T(5, "Shrimad Bhagwat Katha", "Dhuri - P.B 2026");
    expect(kathaOf({ videoTitle: title })).toMatchObject({ place: "Dhuri", region: "Punjab", day: 5 });
    expect(kathaOf({ videoTitle: title, place: "Sikar", day: 2 })).toMatchObject({ place: "Sikar", region: "", day: 2 });
    expect(kathaOf({ videoTitle: "", place: "Jaipur" })).toMatchObject({ place: "Jaipur", day: null });
  });
});

describe("kathaQueue", () => {
  const mk = (slug: string, videoTitle: string, start: number, category = "bhajan") =>
    ({ slug, videoId: slug.padEnd(11, "x"), videoTitle, start, end: start + 60, createdAt: "2026-10-01", title: slug, tags: [], category }) as unknown as Clip;
  const dhuri = (d: number) => T(d, "Shrimad Bhagwat Katha", "Dhuri - P.B 2026");
  const sikar = (d: number) => T(d, "Shrimad Bhagwat Katha", "Sikar - RJ 2026");
  const clips = [
    mk("s7", sikar(7), 10),
    mk("d5b", dhuri(5), 900),
    mk("d2", dhuri(2), 100),
    mk("d5a", dhuri(5), 50),
    mk("k1", dhuri(3), 10, "katha"),
  ];

  it("keeps the current katha together and first, in day then time order, and only its own section", () => {
    const q = kathaQueue(clips, clips[1]).map((c) => c.slug);
    expect(q).toEqual(["d2", "d5a", "d5b", "s7"]);
  });
  it("includes the current clip even when it is missing from the list", () => {
    const extra = mk("new", dhuri(1), 5);
    expect(kathaQueue(clips, extra).map((c) => c.slug)).toContain("new");
  });
});
