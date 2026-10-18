// Single-purpose links sent by email: "verify this address" and "reset this password".
// Stateless: a signed payload with an expiry. A reset link also carries a fingerprint of the current
// password, so it stops working the moment the password changes (one use).
import { createHash } from "node:crypto";
import { hmac, safeEqual } from "./session";

export type TokenKind = "verify" | "reset";
type Payload = { k: TokenKind; u: string; e: number; f?: string };

const TTL: Record<TokenKind, number> = { verify: 60 * 60 * 24 * 3, reset: 60 * 60 };

export const fingerprint = (passwordHash: string | null) => createHash("sha256").update(passwordHash ?? "").digest("base64url").slice(0, 16);

export async function makeToken(k: TokenKind, userId: string, passwordHash?: string | null): Promise<string> {
  const p: Payload = { k, u: userId, e: Math.floor(Date.now() / 1000) + TTL[k], ...(k === "reset" ? { f: fingerprint(passwordHash ?? null) } : {}) };
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${await hmac(`t.${body}`)}`;
}

export async function readToken(token: string, k: TokenKind): Promise<Payload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig || !(await safeEqual(sig, await hmac(`t.${body}`)))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return p.k === k && typeof p.u === "string" && p.e > Date.now() / 1000 ? p : null;
  } catch {
    return null;
  }
}
