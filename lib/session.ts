// Admin sign-in: one password (ADMIN_PASSWORD) and a signed, HTTP-only cookie.
// The cookie holds an expiry time and an HMAC of it keyed by ADMIN_SESSION_SECRET.
import { cookies } from "next/headers";
import { connection } from "next/server";

export const SESSION_COOKIE = "sk_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-session-secret-change-me-0123456789";
  throw new Error("ADMIN_SESSION_SECRET must be set (32+ characters).");
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
  return Buffer.from(sig).toString("base64url");
}

/** Constant-time string comparison (compares SHA-256 digests of equal length). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function checkPassword(given: string): Promise<boolean> {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  return safeEqual(given, real);
}

export async function startSession() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  (await cookies()).set(SESSION_COOKIE, `${exp}.${await hmac(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  await connection(); // per-request check: reads the clock and the cookie
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(exp));
}

/** Bearer-token check for the secret-protected route handlers. */
export async function hasBearer(req: Request, envName: "REVALIDATE_SECRET" | "CRON_SECRET"): Promise<boolean> {
  const want = process.env[envName];
  if (!want) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return safeEqual(got, want);
}
