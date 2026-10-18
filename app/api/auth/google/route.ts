import { NextResponse } from "next/server";
import { challengeOf, googleConfigured, OAUTH_COOKIE, randomToken, redirectUri, safeReturn } from "@/lib/google";

/** Step 1: send the visitor to Google, remembering a one-time state and PKCE secret in a short-lived cookie. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!googleConfigured()) return NextResponse.redirect(`${origin}/my?error=not-configured`);
  const state = randomToken();
  const verifier = randomToken(48);
  const to = safeReturn(new URL(req.url).searchParams.get("to"));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await challengeOf(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, to }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
