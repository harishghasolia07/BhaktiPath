import { describe, expect, it } from "vitest";
import { nextSubmission } from "./submission";

describe("nextSubmission", () => {
  it("Public sends a private, rejected or already-pending video for review", () => {
    expect(nextSubmission(null, true)).toBe("pending");
    expect(nextSubmission(undefined, true)).toBe("pending");
    expect(nextSubmission("rejected", true)).toBe("pending");
    expect(nextSubmission("pending", true)).toBe("pending");
  });
  it("Private withdraws a request and clears a rejection", () => {
    expect(nextSubmission("pending", false)).toBeNull();
    expect(nextSubmission("rejected", false)).toBeNull();
    expect(nextSubmission(null, false)).toBeNull();
  });
  it("an approved video stays approved either way", () => {
    expect(nextSubmission("approved", true)).toBe("approved");
    expect(nextSubmission("approved", false)).toBe("approved");
  });
});
