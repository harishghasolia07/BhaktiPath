import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/accounts";
import { startUserSession } from "@/lib/user-session";

/** Development only, and only while Google isn't configured: signs in as a test person so the account
 *  features can be tried (and tested) without a Google project. Disabled in production. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.GOOGLE_CLIENT_ID) return new NextResponse("Not found", { status: 404 });
  const who = new URL(req.url).searchParams.get("as") === "b" ? "b" : "a";
  const user = await getAccounts().upsertGoogleUser({ sub: `dev-${who}`, name: `Test Devotee ${who.toUpperCase()}`, email: `dev-${who}@example.test`, picture: "" });
  await startUserSession(user.id);
  return NextResponse.redirect(new URL("/my", req.url));
}
