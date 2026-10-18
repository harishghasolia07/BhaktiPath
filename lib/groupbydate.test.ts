import { describe, expect, it } from "vitest";
import type { Clip } from "./clip-schema";
import { groupByDate } from "./display";

const mk = (slug: string, createdAt: string) => ({ id: slug, slug, title: slug, createdAt }) as unknown as Clip;

describe("groupByDate", () => {
  it("groups by the India day added, newest day and newest clip first, with Today/Yesterday labels", () => {
    const now = Date.parse("2026-10-20T08:00:00Z"); // 20 Oct, 13:30 in India
    const g = groupByDate(
      [mk("old", "2026-10-15T05:00:00Z"), mk("a", "2026-10-20T03:00:00Z"), mk("b", "2026-10-20T04:00:00Z"), mk("late", "2026-10-19T20:00:00Z"), mk("y", "2026-10-19T09:00:00Z")],
      now,
    );
    expect(g.map((x) => [x.key, x.clips.map((c) => c.slug).join()])).toEqual([
      ["2026-10-20", "b,a,late"], // "late" is 01:30 on the 20th in India
      ["2026-10-19", "y"],
      ["2026-10-15", "old"],
    ]);
    expect(g[0].label).toMatch(/^Today · /);
    expect(g[1].label).toMatch(/^Yesterday · /);
    expect(g[2].label).toBe("Thu, 15 Oct 2026");
  });
  it("returns nothing for no clips", () => {
    expect(groupByDate([])).toEqual([]);
  });
});
