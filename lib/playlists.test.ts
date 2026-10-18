import { describe, expect, it } from "vitest";
import { addItem, cleanName, isItemKey, moveItem, PLAYLIST_LIMITS, removeItem, visibleKeys } from "./playlists";

describe("playlist rules", () => {
  it("cleans names", () => {
    expect(cleanName("  Morning   aarti  ")).toBe("Morning aarti");
    expect(cleanName("")).toBe("");
    expect(cleanName(5)).toBe("");
    expect(cleanName("x".repeat(100))).toHaveLength(PLAYLIST_LIMITS.name);
  });
  it("adds each bhajan once and respects the size limit", () => {
    expect(addItem(["a"], "b")).toEqual({ items: ["a", "b"], added: true });
    expect(addItem(["a"], "a")).toEqual({ items: ["a"], added: false });
    const full = Array.from({ length: PLAYLIST_LIMITS.items }, (_, i) => `k${i}`);
    expect(addItem(full, "new").added).toBe(false);
  });
  it("removes and reorders", () => {
    expect(removeItem(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(moveItem(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b"], "zzz", "up")).toEqual(["a", "b"]);
  });
  it("shows only public clips to anyone but the owner", () => {
    const items = ["jai-radhe", "my-123", "main-bairagan"];
    expect(visibleKeys(items, true)).toEqual(items);
    expect(visibleKeys(items, false)).toEqual(["jai-radhe", "main-bairagan"]);
  });
  it("accepts only sane item keys", () => {
    expect(isItemKey("jai-radhe-radhe")).toBe(true);
    expect(isItemKey("my-6ad47a82")).toBe(true);
    expect(isItemKey("../x")).toBe(false);
    expect(isItemKey("")).toBe(false);
    expect(isItemKey(3)).toBe(false);
  });
});
