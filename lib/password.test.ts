import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("accepts the right password and rejects others", async () => {
    const h = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("correct horse batterY", h)).toBe(false);
    expect(await verifyPassword("", h)).toBe(false);
  });
  it("salts every hash differently and never stores the password", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
    expect(a).not.toContain("same");
  });
  it("rejects when there is no stored hash or it is malformed", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});
