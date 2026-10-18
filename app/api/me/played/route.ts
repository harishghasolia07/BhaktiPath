import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/accounts";
import { currentUser } from "@/lib/user-session";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
  if (!body || typeof body.key !== "string" || !/^[\w-]{1,120}$/.test(body.key)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await getAccounts().markPlayed(u.id, body.key);
  return NextResponse.json({ ok: true });
}
