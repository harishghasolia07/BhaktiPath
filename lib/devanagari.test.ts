import { describe, expect, it } from "vitest";
import { toLatin } from "./devanagari";

describe("toLatin", () => {
  it("reads the words a bhajan name is checked against", () => {
    expect(toLatin("मुरलिया")).toBe("muraliyaa");
    expect(toLatin("यमुना")).toBe("yamunaa");
    expect(toLatin("बाजे रे")).toBe("baaje re");
  });
  it("drops the inherent a at the end of a word but keeps it inside", () => {
    expect(toLatin("गीत")).toBe("geet");
    expect(toLatin("गोविंद")).toBe("govind");
    expect(toLatin("कृष्ण")).toBe("krishn");
  });
  it("handles matras, virama and anusvara", () => {
    expect(toLatin("राधे")).toBe("raadhe");
    expect(toLatin("नंदलाल")).toBe("nandalaal");
    expect(toLatin("आरती")).toBe("aaratee");
  });
  it("leaves Latin text and punctuation alone", () => {
    expect(toLatin("Geet (Jai Jai Dev Hare)")).toBe("Geet (Jai Jai Dev Hare)");
  });
});
