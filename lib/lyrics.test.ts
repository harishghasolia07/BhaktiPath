import { describe, expect, it } from "vitest";
import { activeLine, buildLines } from "./lyrics";

const ev = (t: number, text: string) => ({ t, text });

describe("buildLines", () => {
  const events = [
    ev(98, "before the clip"),
    ev(100, "राधे कृष्ण"),
    ev(101, "गोविंद गोविंद"),
    ev(105, "गोपाल"),
    ev(106, "[संगीत]"),
    ev(107, "मेरा नाथ तू है"),
    ev(108, "नहीं मैं अकेला"),
    ev(110, "आज हम इस कथा में बहुत सुंदर प्रसंग के बारे में बात करेंगे"),
    ev(200, "after the clip"),
  ];
  const lines = buildLines(events, 100, 150);
  it("joins fragments that follow quickly, and breaks on pauses and music markers", () => {
    expect(lines.map((l) => [l.t, l.text])).toEqual([
      [100, "राधे कृष्ण गोविंद गोविंद"],
      [105, "गोपाल"],
      [107, "मेरा नाथ तू है नहीं मैं अकेला"],
      [110, "आज हम इस कथा में बहुत सुंदर प्रसंग के बारे में बात करेंगे"],
    ]);
  });
  it("keeps only what is inside the clip", () => {
    expect(lines.some((l) => l.text.includes("before") || l.text.includes("after"))).toBe(false);
  });
  it("marks long sentences as spoken", () => {
    expect(lines.map((l) => l.spoken)).toEqual([false, false, false, true]);
  });
  it("starts a new line when one gets too long", () => {
    const long = buildLines([ev(0, "एक दो तीन चार पांच छह सात"), ev(1, "आठ नौ दस ग्यारह बारह तेरह चौदह")], 0, 10, 2.2, 30);
    expect(long).toHaveLength(2);
  });
});

describe("activeLine", () => {
  const lines = [
    { t: 10, text: "a", spoken: false },
    { t: 20, text: "b", spoken: false },
  ];
  it("is the last line that has begun", () => {
    expect(activeLine(lines, 5)).toBe(-1);
    expect(activeLine(lines, 10)).toBe(0);
    expect(activeLine(lines, 19.9)).toBe(1); // a quarter-second early, so the highlight lands with the voice
    expect(activeLine(lines, 99)).toBe(1);
  });
});
