import { describe, expect, it } from "vitest";
import { shuffled } from "./shuffle";

describe("shuffled", () => {
  it("keeps every item exactly once and leaves the input alone", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("changes the order for a fixed random source, and handles tiny lists", () => {
    let n = 0;
    const seq = () => [0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.8][n++ % 7];
    expect(shuffled([1, 2, 3, 4, 5, 6, 7, 8], seq)).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shuffled([])).toEqual([]);
    expect(shuffled([1])).toEqual([1]);
  });
});
