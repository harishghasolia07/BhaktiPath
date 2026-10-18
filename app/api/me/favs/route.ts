import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/accounts";
import { currentUser } from "@/lib/user-session";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { key?: unknown; on?: unknown } | null;
  if (!body || typeof body.key !== "string" || !/^[\w-]{1,120}$/.test(body.key) || typeof body.on !== "boolean")
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  await getAccounts().setFav(u.id, body.key, body.on);
  return NextResponse.json({ ok: true });
}
