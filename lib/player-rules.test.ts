import { describe, expect, it } from "vitest";
import { afterEnd, appendToQueue, insertNext, nextRepeat, nextSpeed, readRepeat, readSpeed } from "./player-rules";

const q = (...s: string[]) => s.map((slug) => ({ slug }));
const slugs = (l: { slug: string }[]) => l.map((x) => x.slug).join(",");

describe("repeat", () => {
  it("cycles off → all → one → off", () => {
    expect(nextRepeat("off")).toBe("all");
    expect(nextRepeat("all")).toBe("one");
    expect(nextRepeat("one")).toBe("off");
  });
  it("reads the saved mode and the old repeat-this-one switch", () => {
    expect(readRepeat("all", null)).toBe("all");
    expect(readRepeat(null, "1")).toBe("one");
    expect(readRepeat(null, "0")).toBe("off");
    expect(readRepeat("nonsense", null)).toBe("off");
  });
});

describe("afterEnd", () => {
  const list = q("a", "b", "c");
  it("repeat one replays", () => expect(afterEnd({ repeat: "one", autoNext: true, list, slug: "b" })).toEqual({ action: "replay" }));
  it("goes on to the next when auto-next is on, or when repeating all", () => {
    expect(afterEnd({ repeat: "off", autoNext: true, list, slug: "a" })).toEqual({ action: "goto", slug: "b" });
    expect(afterEnd({ repeat: "all", autoNext: false, list, slug: "a" })).toEqual({ action: "goto", slug: "b" });
  });
  it("stops at the end of the list unless repeating all, which wraps to the first", () => {
    expect(afterEnd({ repeat: "off", autoNext: true, list, slug: "c" })).toEqual({ action: "stop" });
    expect(afterEnd({ repeat: "off", autoNext: false, list, slug: "a" })).toEqual({ action: "stop" });
    expect(afterEnd({ repeat: "all", autoNext: true, list, slug: "c" })).toEqual({ action: "goto", slug: "a" });
  });
  it("repeat all on a single bhajan replays it", () => expect(afterEnd({ repeat: "all", autoNext: true, list: q("a"), slug: "a" })).toEqual({ action: "replay" }));
});

describe("queue edits", () => {
  it("play next goes right after the current bhajan, without duplicates", () => {
    expect(slugs(insertNext(q("a", "b", "c"), "a", { slug: "x" }))).toBe("a,x,b,c");
    expect(slugs(insertNext(q("a", "b", "c", "x"), "a", { slug: "x" }))).toBe("a,x,b,c");
    expect(slugs(insertNext(q("a", "b"), "gone", { slug: "x" }))).toBe("a,b,x");
    expect(slugs(insertNext(q("a", "b"), "a", { slug: "a" }))).toBe("a,b");
  });
  it("add to queue goes to the end, without duplicates", () => {
    expect(slugs(appendToQueue(q("a", "b", "c"), "a", { slug: "x" }))).toBe("a,b,c,x");
    expect(slugs(appendToQueue(q("a", "x", "c"), "a", { slug: "x" }))).toBe("a,c,x");
    expect(slugs(appendToQueue(q("a", "b"), "a", { slug: "a" }))).toBe("a,b");
  });
});

describe("speed", () => {
  it("cycles 1 → 1.25 → 1.5 → 0.75 → 1 and reads only known values", () => {
    expect([1, 1.25, 1.5, 0.75].map(nextSpeed)).toEqual([1.25, 1.5, 0.75, 1]);
    expect(readSpeed("1.5")).toBe(1.5);
    expect(readSpeed("3")).toBe(1);
    expect(readSpeed(null)).toBe(1);
  });
});
