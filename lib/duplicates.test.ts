import { describe, expect, it } from "vitest";
import { findDuplicates } from "./duplicates";

const a = { videoId: "AAAAAAAAAAA", start: 1000, end: 1600, title: "Radhe Radhe Japo" };
const cand = (o: object) => ({ videoId: "AAAAAAAAAAA", start: 2000, end: 2400, title: "Something Else Entirely", ...o });

describe("findDuplicates", () => {
  it("flags overlapping times on the same video", () => {
    expect(findDuplicates(cand({ start: 1500, end: 1900 }), [a]).map((d) => d.reason)).toEqual(["overlap"]);
  });
  it("flags a near miss within a minute, not further away", () => {
    expect(findDuplicates(cand({ start: 1655, end: 1900 }), [a]).map((d) => d.reason)).toEqual(["near"]);
    expect(findDuplicates(cand({ start: 1700, end: 1900 }), [a])).toEqual([]);
  });
  it("flags the same name (across scripts) on a different video, but not short names", () => {
    expect(findDuplicates(cand({ videoId: "BBBBBBBBBBB", title: "राधे राधे जपो" }), [a]).map((d) => d.reason)).toEqual(["title"]);
    expect(findDuplicates(cand({ videoId: "BBBBBBBBBBB", title: "Hari" }), [{ ...a, title: "Hari" }])).toEqual([]);
  });
  it("never matches itself", () => {
    expect(findDuplicates(a, [a])).toEqual([]);
  });
});

import { findRepeat } from "./duplicates";

describe("findRepeat (a video someone adds)", () => {
  const clip = { videoId: "AAAAAAAAAAA", start: 1000, end: 1600, title: "x" };
  it("flags the same part, or most of it", () => {
    expect(findRepeat({ videoId: "AAAAAAAAAAA", start: 1000, end: 1600 }, [clip])?.reason).toBe("overlap");
    expect(findRepeat({ videoId: "AAAAAAAAAAA", start: 1100, end: 1500 }, [clip])?.reason).toBe("overlap"); // a trim of it
    expect(findRepeat({ videoId: "AAAAAAAAAAA", start: 1300, end: 1900 }, [clip])?.reason).toBe("overlap"); // half covered
  });
  it("does not flag a whole video that only contains the clip, nor a bhajan cut out of a whole video", () => {
    expect(findRepeat({ videoId: "AAAAAAAAAAA", start: 0, end: 10000 }, [clip])).toBeNull();
    expect(findRepeat({ videoId: "AAAAAAAAAAA", start: 1000, end: 1600 }, [{ ...clip, start: 0, end: 10000 }])).toBeNull();
  });
  it("flags a neighbour within a minute, not further away or on another video", () => {
    expect(findRepeat({ videoId: "AAAAAAAAAAA", start: 1650, end: 1900 }, [clip])?.reason).toBe("near");
    expect(findRepeat({ videoId: "AAAAAAAAAAA", start: 1700, end: 1900 }, [clip])).toBeNull();
    expect(findRepeat({ videoId: "BBBBBBBBBBB", start: 1000, end: 1600 }, [clip])).toBeNull();
  });
});
