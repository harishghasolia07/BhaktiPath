import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/accounts";
import { readToken } from "@/lib/tokens";

/** The link in the "confirm your email" message. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = await readToken(url.searchParams.get("token") ?? "", "verify");
  if (!t) return NextResponse.redirect(`${url.origin}/my?error=link`);
  await getAccounts().markVerified(t.u);
  return NextResponse.redirect(`${url.origin}/my?verified=1`);
}
