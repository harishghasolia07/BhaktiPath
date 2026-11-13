import { describe, expect, it } from "vitest";
import type { Clip } from "./clip-schema";
import { publicClip, publicClips } from "./public-clip";

const mk = (id: string, videoId: string, start: number, end: number, createdAt = "2026-10-01") =>
  ({ id, slug: id, videoId, start, end, createdAt, title: id, tags: [], categories: ["bhajan"] }) as unknown as Clip;

describe("public clips", () => {
  it("removes the real times but keeps the length", () => {
    const shown = publicClip(mk("a", "v1", 120, 300));
    expect(shown.start).toBe(0);
    expect(shown.end).toBe(180);
    expect(shown.rank).toBe(0);
  });

  it("ranks clips inside each source video without revealing their real starts", () => {
    const clips = [mk("b", "v1", 900, 1000), mk("a", "v1", 100, 200), mk("c", "v2", 5000, 5100)];
    const shown = publicClips(clips);
    expect(shown.map((c) => c.slug)).toEqual(["b", "a", "c"]); // input order is untouched
    expect(shown.map((c) => c.rank)).toEqual([1, 0, 0]);
    expect(shown.map((c) => [c.start, c.end])).toEqual([
      [0, 100],
      [0, 100],
      [0, 100],
    ]);
  });

  it("does not subtract the length twice", () => {
    const once = publicClip(mk("a", "v1", 120, 300));
    expect(publicClip(once)).toBe(once);
  });
});
