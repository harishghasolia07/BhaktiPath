import { describe, expect, it } from "vitest";
import { isNewClip, resumeOffer } from "./resume";

const clip = { slug: "a", start: 100, end: 400 };
const NOW = 1_800_000_000_000;

describe("resumeOffer", () => {
  it("offers the saved second inside the clip", () => {
    expect(resumeOffer({ slug: "a", t: 250, at: NOW - 1000 }, clip, NOW)).toBe(250);
  });
  it("offers nothing when it is too early, nearly over, for another clip, too old, or missing", () => {
    expect(resumeOffer({ slug: "a", t: 105, at: NOW }, clip, NOW)).toBeNull();
    expect(resumeOffer({ slug: "a", t: 395, at: NOW }, clip, NOW)).toBeNull();
    expect(resumeOffer({ slug: "b", t: 250, at: NOW }, clip, NOW)).toBeNull();
    expect(resumeOffer({ slug: "a", t: 250, at: NOW - 31 * 86_400_000 }, clip, NOW)).toBeNull();
    expect(resumeOffer(null, clip, NOW)).toBeNull();
    expect(resumeOffer({ slug: "a", t: 250, at: NOW }, undefined, NOW)).toBeNull();
  });
});

describe("isNewClip", () => {
  it("marks only clips added after the previous visit", () => {
    expect(isNewClip("2026-10-10T00:00:00Z", Date.parse("2026-10-05T00:00:00Z"))).toBe(true);
    expect(isNewClip("2026-10-01T00:00:00Z", Date.parse("2026-10-05T00:00:00Z"))).toBe(false);
  });
  it("marks nothing on a first visit", () => {
    expect(isNewClip("2026-10-10T00:00:00Z", 0)).toBe(false);
  });
});
