// Signed-in visitors: a signed, HTTP-only cookie holding the user's id and an expiry.
// Same key as the admin cookie but a different name and a "u." prefix inside the signature,
// so the two can never be swapped for each other.
import { cookies } from "next/headers";
import { connection } from "next/server";
import { hmac, safeEqual } from "./session";
import { getAccounts, type User } from "./accounts";

export const USER_COOKIE = "sk_user";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export async function startUserSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  (await cookies()).set(USER_COOKIE, `${payload}.${await hmac(`u.${payload}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endUserSession() {
  (await cookies()).delete(USER_COOKIE);
}

/** The signed-in user for this request, or null. Always per-request. */
export async function currentUser(): Promise<User | null> {
  await connection();
  const raw = (await cookies()).get(USER_COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !(await safeEqual(sig, await hmac(`u.${payload}`)))) return null;
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u?: string; e?: number };
    if (typeof u !== "string" || typeof e !== "number" || e < Date.now() / 1000) return null;
    return await getAccounts().getUser(u);
  } catch {
    return null;
  }
}
