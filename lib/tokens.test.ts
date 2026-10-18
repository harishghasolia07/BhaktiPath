import { beforeAll, describe, expect, it, vi } from "vitest";
import { fingerprint, makeToken, readToken } from "./tokens";

describe("email tokens", () => {
  beforeAll(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret-test-secret-test-secret-12345");
  });
  it("round-trips and only works for its own purpose", async () => {
    const t = await makeToken("verify", "user1");
    expect((await readToken(t, "verify"))?.u).toBe("user1");
    expect(await readToken(t, "reset")).toBeNull();
  });
  it("rejects tampering", async () => {
    const t = await makeToken("verify", "user1");
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "verify", u: "someone-else", e: 9999999999 })).toString("base64url");
    expect(await readToken(`${forged}.${sig}`, "verify")).toBeNull();
    expect(await readToken(`${body}.x${sig}`, "verify")).toBeNull();
    expect(await readToken("garbage", "verify")).toBeNull();
  });
  it("a reset token carries a fingerprint of the current password, so it dies when the password changes", async () => {
    const t = await makeToken("reset", "u", "hash-A");
    expect((await readToken(t, "reset"))?.f).toBe(fingerprint("hash-A"));
    expect((await readToken(t, "reset"))?.f).not.toBe(fingerprint("hash-B"));
  });
});
