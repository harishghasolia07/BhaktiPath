import { describe, expect, it } from "vitest";
import { parseBulk } from "./bulk";

describe("parseBulk", () => {
  it("reads full lines", () => {
    const [r] = parseBulk("https://youtu.be/fH2lNOThsV0 | Radhe Radhe Japo | 21:31 | 30:45 | bhajan");
    expect(r.error).toBeUndefined();
    expect(r.clip).toMatchObject({ videoId: "fH2lNOThsV0", title: "Radhe Radhe Japo", start: 1291, end: 1845, categories: ["bhajan"] });
  });
  it("takes several sections at once", () => {
    const [r] = parseBulk("fH2lNOThsV0 | Radhe Radhe | 21:31 | 30:45 | kirtan + bhajan");
    expect(r.clip?.categories).toEqual(["bhajan", "kirtan"]);
  });
  it("takes the start from the link and defaults the section", () => {
    const [r] = parseBulk("https://www.youtube.com/live/fH2lNOThsV0?t=1291 | Radhe Radhe | 30:45");
    expect(r.clip).toMatchObject({ start: 1291, end: 1845, categories: ["kirtan"] });
  });
  it("accepts Hindi section names, skips blanks and comments, numbers lines", () => {
    const rows = parseBulk("# my list\n\nfH2lNOThsV0 | गोविन्द बोलो | 1:00 | 2:00 | कीर्तन\nfH2lNOThsV0 | x | 5:00 | 4:00");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ line: 3, clip: { categories: ["kirtan"] } });
    expect(rows[1].line).toBe(4);
    expect(rows[1].error).toMatch(/after the start/);
  });
  it("explains what is wrong", () => {
    expect(parseBulk("just words")[0].error).toMatch(/Use:/);
    expect(parseBulk("https://example.com | a | 1:00 | 2:00")[0].error).toMatch(/No YouTube/);
    expect(parseBulk("fH2lNOThsV0 | a | 1:00 | 2:00 | film")[0].error).toMatch(/Section/);
  });
});
