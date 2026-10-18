import { describe, expect, it } from "vitest";
import { formatLength, formatTime, parseTime, parseVideoId, startFromUrl, thumbnailUrl } from "./youtube";

describe("parseVideoId", () => {
  it.each([
    ["https://www.youtube.com/live/fH2lNOThsV0?si=iZsnlc8JknM9M10E&t=1291", "fH2lNOThsV0"],
    ["https://www.youtube.com/watch?v=FiGC8c9z-Y8&t=30s", "FiGC8c9z-Y8"],
    ["https://youtu.be/hGPB-CIEQlQ?t=10", "hGPB-CIEQlQ"],
    ["https://www.youtube.com/embed/5sH1ivfDrHc", "5sH1ivfDrHc"],
    ["https://youtube.com/shorts/5sH1ivfDrHc", "5sH1ivfDrHc"],
    ["https://m.youtube.com/watch?feature=share&v=fH2lNOThsV0", "fH2lNOThsV0"],
    ["  fH2lNOThsV0 ", "fH2lNOThsV0"],
  ])("%s", (input, id) => expect(parseVideoId(input)).toBe(id));

  it("rejects text without an ID", () => {
    expect(parseVideoId("https://www.youtube.com/@BhaktiPath")).toBeNull();
    expect(parseVideoId("hello")).toBeNull();
  });
});

describe("parseTime", () => {
  it.each([
    ["21:31", 1291],
    ["1:05:20", 3920],
    ["1291", 1291],
    ["0:07", 7],
    ["21m31s", 1291],
    ["1h05m20s", 3920],
    ["45s", 45],
    [1291, 1291],
  ])("%s -> %i", (input, s) => expect(parseTime(input)).toBe(s));

  it.each(["", "abc", "1:60", "1:2:3:4", "-5", "12:", ":30"])("rejects %j", (input) => expect(parseTime(input)).toBeNull());
});

describe("formatTime / formatLength", () => {
  it("formats like YouTube", () => {
    expect(formatTime(1291)).toBe("21:31");
    expect(formatTime(3920)).toBe("1:05:20");
    expect(formatTime(7)).toBe("0:07");
  });
  it("round-trips", () => {
    for (const s of [0, 59, 60, 1291, 3599, 3600, 8557]) expect(parseTime(formatTime(s))).toBe(s);
  });
  it("describes clip length", () => {
    expect(formatLength(45)).toBe("45 sec");
    expect(formatLength(554)).toBe("9 min");
    expect(formatLength(3840)).toBe("1 hr 4 min");
    expect(formatLength(3580)).toBe("1 hr"); // not "0 hr 60 min"
    expect(formatLength(7200)).toBe("2 hr");
  });
});

describe("links", () => {
  it("reads t= from shared links", () => {
    expect(startFromUrl("https://www.youtube.com/live/fH2lNOThsV0?si=x&t=1291")).toBe(1291);
    expect(startFromUrl("https://youtu.be/x?t=21m31s")).toBe(1291);
    expect(startFromUrl("https://youtu.be/x")).toBeNull();
  });
  it("builds thumbnails", () => {
    expect(thumbnailUrl("fH2lNOThsV0")).toBe("https://i.ytimg.com/vi/fH2lNOThsV0/hqdefault.jpg");
    expect(thumbnailUrl("fH2lNOThsV0", "maxres")).toBe("https://i.ytimg.com/vi/fH2lNOThsV0/maxresdefault.jpg");
  });
});
