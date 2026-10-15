import { describe, expect, it } from "vitest";
import { findSegments, parseVtt, type CapEvent } from "./finder";

const VTT = `WEBVTT

00:00:01.000 --> 00:00:03.000 align:start position:0%
 
हे<00:00:01.5><c> राधे</c>

00:00:03.000 --> 00:00:03.010 align:start position:0%
हे राधे
 

00:00:03.010 --> 00:00:05.000 align:start position:0%
हे राधे
श्री<00:00:03.5><c> राधे</c><c> [संगीत]</c>
`;

describe("parseVtt", () => {
  it("keeps each line once, with the time it first appears", () => {
    const ev = parseVtt(VTT);
    expect(ev.map((e) => e.text)).toEqual(["हे राधे", "श्री राधे [संगीत]"]);
    expect(ev[0].t).toBe(1);
  });
});

describe("findSegments", () => {
  const speech = (t: number): CapEvent => ({ t, text: "आज हम भगवान की कथा सुनेंगे और आगे बढ़ेंगे" });
  const music = (t: number): CapEvent => ({ t, text: "[संगीत]" });
  // speech to 600s, a bhajan 700-1000s (marker every 20s), speech again, a stray marker at 2000s
  const events: CapEvent[] = [
    ...Array.from({ length: 20 }, (_, i) => speech(i * 30)),
    ...Array.from({ length: 16 }, (_, i) => music(700 + i * 20)),
    ...Array.from({ length: 10 }, (_, i) => speech(1100 + i * 30)),
    music(2000),
  ];

  it("finds the bhajan, pads it, and ignores a stray marker", () => {
    const segs = findSegments(events);
    expect(segs).toHaveLength(1);
    expect(segs[0].start).toBe(660); // 700 - 40
    expect(segs[0].end).toBe(1020); // 1000 + 20
    expect(segs[0].markers).toBe(16);
  });
  it("joins pauses shorter than the gap and splits longer ones", () => {
    const two = [...Array.from({ length: 8 }, (_, i) => music(100 + i * 20)), ...Array.from({ length: 8 }, (_, i) => music(500 + i * 20))];
    expect(findSegments(two)).toHaveLength(2);
    expect(findSegments(two, { gap: 400 })).toHaveLength(1);
  });
  it("returns nothing without markers", () => {
    expect(findSegments(Array.from({ length: 5 }, (_, i) => speech(i * 30)))).toEqual([]);
  });
});
