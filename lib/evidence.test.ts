import { describe, expect, it } from "vitest";
import { evidenceFor, guessEnd, singingResumes } from "./evidence";

const ev = (t: number, text: string) => ({ t, text });
// 10:00-14:00 is singing with markers every 20 s; 14:00+ is a long spoken sentence
const events = [
  ...Array.from({ length: 13 }, (_, i) => ev(600 + i * 20, i % 2 ? "[संगीत]" : `राधे कृष्ण गोविंद ${i}`)),
  ev(900, "इस कथा में आज हम बहुत सारी बातें आपके सामने रखेंगे आप सब सुनिए"),
  ev(920, "और फिर आगे चलकर हम इस प्रसंग को पूरा करेंगे आप सब ध्यान दीजिए"),
];

describe("evidenceFor", () => {
  it("lists the first lines sung and counts the markers", () => {
    const e = evidenceFor(events, 600, 860, false);
    expect(e.first[0].text).toBe("राधे कृष्ण गोविंद 0");
    expect(e.markers).toBe(6);
    expect(e.warnings).toEqual([]);
  });
  it("warns when a range ends in speaking", () => {
    const e = evidenceFor(events, 600, 960, false);
    expect(e.warnings.join(" ")).toMatch(/end looks like speaking/);
  });
  it("warns when a range has hardly any singing", () => {
    expect(evidenceFor(events, 900, 960, false).warnings.join(" ")).toMatch(/hardly any/);
  });
  it("samples a mix about every 45 seconds", () => {
    expect(evidenceFor(events, 600, 860, true).samples.length).toBeGreaterThan(2);
  });
});

describe("singingResumes", () => {
  it("finds singing that starts again soon after a time", () => {
    const e = [ev(100, "[संगीत]"), ev(400, "[संगीत]")];
    expect(singingResumes(e, 150)).toBe(400);
    expect(singingResumes(e, 150, 100)).toBeNull();
  });
});

describe("guessEnd", () => {
  it("finds where the singing stops", () => {
    expect(guessEnd(events, 600)).toBe(Math.ceil((600 + 11 * 20 + 15) / 5) * 5); // the last marker is at 10:00 + 220 s
  });
  it("gives up when there is no singing after the start", () => {
    expect(guessEnd(events, 2000)).toBeNull();
  });
});
