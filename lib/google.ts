// Sign in with Google: the OAuth "authorization code" flow with PKCE, done by hand (no library).
export const OAUTH_COOKIE = "sk_oauth";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

export function randomToken(n = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(n)));
}

export async function challengeOf(verifier: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

/** Only same-site paths: "/my", never "//evil.com" or "https://…". */
export function safeReturn(to: string | null | undefined): string {
  return to && /^\/(?![/\\])/.test(to) ? to : "/";
}

export function redirectUri(req: Request): string {
  return `${new URL(req.url).origin}/api/auth/google/callback`;
}

export type IdClaims = { sub: string; email: string; email_verified?: boolean; name?: string; picture?: string; aud: string; iss: string; exp: number };

/** Reads the ID token Google just sent us over TLS and checks who it is for. (Its signature need not be
 *  re-verified: it came straight from Google's token endpoint, per OpenID Connect Core 3.1.3.7.) */
export function claimsOf(idToken: string, clientId: string): IdClaims | null {
  try {
    const c = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString()) as IdClaims;
    const issOk = c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com";
    if (!issOk || c.aud !== clientId || c.exp < Date.now() / 1000 || !c.sub || !c.email) return null;
    return c;
  } catch {
    return null;
  }
}
