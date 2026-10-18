import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/accounts";
import { claimsOf, OAUTH_COOKIE, redirectUri, safeReturn } from "@/lib/google";
import { safeEqual } from "@/lib/session";
import { startUserSession } from "@/lib/user-session";

/** Step 2: Google sends the visitor back with a code; swap it for their identity and sign them in. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (why: string) => {
    const res = NextResponse.redirect(`${url.origin}/my?error=${why}`);
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return res;
  };
  const raw = req.headers.get("cookie")?.match(new RegExp(`${OAUTH_COOKIE}=([^;]+)`))?.[1];
  let saved: { state: string; verifier: string; to: string } | null = null;
  try {
    saved = raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {}
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (url.searchParams.get("error")) return fail("cancelled");
  if (!saved || !code || !(await safeEqual(state, saved.state))) return fail("state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!tokenRes?.ok) return fail("google");
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  const claims = id_token ? claimsOf(id_token, process.env.GOOGLE_CLIENT_ID!) : null;
  if (!claims || claims.email_verified === false) return fail("google");

  const user = await getAccounts().upsertGoogleUser({
    sub: claims.sub,
    email: claims.email,
    name: (claims.name ?? claims.email.split("@")[0]).slice(0, 80),
    picture: claims.picture ?? "",
  });
  await startUserSession(user.id);
  const res = NextResponse.redirect(`${url.origin}${safeReturn(saved.to)}`);
  res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  return res;
}
