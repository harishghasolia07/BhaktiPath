import { describe, expect, it } from "vitest";
import { parseNotes } from "./addnotes";

const NOTES = `day 1 - https://www.youtube.com/watch?v=6fpAI11NEHU&t=7903s
15:30 - 26:50 - hey gopal radhe krishna govind govind
1:38:23 - 1:44:32 - mera naath tu hai nahi me akela
2:02:15 - 2:09:31 - mix-end

day 1 - https://www.youtube.com/watch?v=wRTCaVm3C94
1:06:54 - 1:15:33 - Paayo ji mene naam ratan dhan paayo
2:24:18 - mix - man bhul mat jaaio radha rani ke charan, radhe radhe govind govind radhe
2:30:00 -
`;

describe("parseNotes", () => {
  const { videos, errors } = parseNotes(NOTES);
  it("splits the notes into videos and clips", () => {
    expect(errors).toEqual([]);
    expect(videos.map((v) => [v.videoId, v.label, v.clips.length])).toEqual([
      ["6fpAI11NEHU", "day 1", 3],
      ["wRTCaVm3C94", "day 1", 3],
    ]);
  });
  it("reads start, end and name", () => {
    expect(videos[0].clips[0]).toMatchObject({ start: 930, end: 1610, name: "hey gopal radhe krishna govind govind", mix: false });
    expect(videos[0].clips[1]).toMatchObject({ start: 5903, end: 6272 });
  });
  it("notices mixes, and a missing end or name", () => {
    expect(videos[0].clips[2]).toMatchObject({ mix: true, name: "end", end: 2 * 3600 + 9 * 60 + 31 });
    expect(videos[1].clips[1]).toMatchObject({ mix: true, start: 2 * 3600 + 24 * 60 + 18, end: null, name: "man bhul mat jaaio radha rani ke charan, radhe radhe govind govind radhe" });
    expect(videos[1].clips[2]).toMatchObject({ start: 9000, end: null, name: "" });
  });
  it("reports lines it cannot read", () => {
    const r = parseNotes("15:30 - 20:00 - no link above\nhttps://youtu.be/6fpAI11NEHU\nnot a time - name\nhttps://example.com/x");
    expect(r.errors).toHaveLength(3); // the non-YouTube link is also a line without a start time
    expect(r.errors[0]).toMatch(/line 1.*no video link/);
    expect(r.errors[1]).toMatch(/line 3.*start time/);
  });
});
