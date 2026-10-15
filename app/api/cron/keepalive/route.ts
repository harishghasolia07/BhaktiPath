// Vercel Cron calls this once a day (vercel.json). MongoDB Atlas pauses a free
// cluster after 30 days with no connections; pages are cached, so ordinary
// visits may not touch the database for weeks. Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
import { connection } from "next/server";
import { hasBearer } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  await connection();
  if (!(await hasBearer(req, "CRON_SECRET"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const store = getStore();
  const t = Date.now();
  await store.ping();
  return Response.json({ ok: true, store: store.kind, ms: Date.now() - t });
}
