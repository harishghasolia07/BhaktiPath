// Called by `npm run clip` after it writes to the database, so pages refresh
// without a redeploy. Needs `Authorization: Bearer <REVALIDATE_SECRET>`.
import { revalidateTag } from "next/cache";
import { CLIPS_TAG } from "@/lib/clips";
import { hasBearer } from "@/lib/session";

export async function POST(req: Request) {
  if (!(await hasBearer(req, "REVALIDATE_SECRET"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // expire: 0 → the next visit renders fresh data instead of the old page.
  revalidateTag(CLIPS_TAG, { expire: 0 });
  return Response.json({ ok: true, revalidated: CLIPS_TAG });
}
