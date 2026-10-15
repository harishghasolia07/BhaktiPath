import { describe, expect, it } from "vitest";
import { matchesQuery, skeleton } from "./translit";

describe("skeleton", () => {
  it("makes Latin and Devanagari spellings meet", () => {
    expect(skeleton("Radhe Radhe")).toBe(skeleton("राधे राधे"));
    expect(skeleton("Govind Bolo")).toBe(skeleton("गोविन्द बोलो"));
    expect(skeleton("Krishna")).toBe(skeleton("कृष्ण"));
    expect(skeleton("Hare Krishna Mahamantra")).toBe(skeleton("हरे कृष्ण महामंत्र"));
  });
});

describe("matchesQuery", () => {
  it("finds across scripts, both ways", () => {
    expect(matchesQuery("राधे राधे जपो", "radhe")).toBe(true);
    expect(matchesQuery("Radhe Radhe Japo", "राधे")).toBe(true);
    expect(matchesQuery("गोविन्द बोलो हरि गोपाल बोलो", "govind")).toBe(true);
    expect(matchesQuery("Radhe Radhe Japo", "ram")).toBe(false);
  });
  it("keeps short queries literal and empty queries open", () => {
    expect(matchesQuery("Radhe", "")).toBe(true);
    expect(matchesQuery("Mere Banke Bihari", "ba")).toBe(true); // plain substring
    expect(matchesQuery("राधे", "ra")).toBe(false); // too short to guess across scripts
  });
});
