import { describe, expect, it } from "vitest";
import { findDuplicates } from "./duplicates";

const a = { videoId: "AAAAAAAAAAA", start: 1000, end: 1600, title: "Radhe Radhe Japo" };
const cand = (o: object) => ({ videoId: "AAAAAAAAAAA", start: 2000, end: 2400, title: "Something Else Entirely", ...o });

describe("findDuplicates", () => {
  it("flags overlapping times on the same video", () => {
    expect(findDuplicates(cand({ start: 1500, end: 1900 }), [a]).map((d) => d.reason)).toEqual(["overlap"]);
  });
  it("flags a near miss within a minute, not further away", () => {
    expect(findDuplicates(cand({ start: 1655, end: 1900 }), [a]).map((d) => d.reason)).toEqual(["near"]);
    expect(findDuplicates(cand({ start: 1700, end: 1900 }), [a])).toEqual([]);
  });
  it("flags the same name (across scripts) on a different video, but not short names", () => {
    expect(findDuplicates(cand({ videoId: "BBBBBBBBBBB", title: "राधे राधे जपो" }), [a]).map((d) => d.reason)).toEqual(["title"]);
    expect(findDuplicates(cand({ videoId: "BBBBBBBBBBB", title: "Hari" }), [{ ...a, title: "Hari" }])).toEqual([]);
  });
  it("never matches itself", () => {
    expect(findDuplicates(a, [a])).toEqual([]);
  });
});
