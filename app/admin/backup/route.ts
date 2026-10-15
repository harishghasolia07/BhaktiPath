// Admin-only JSON backup of every clip (Atlas's free tier has no backups of its own).
// Restore with: npm run clip -- import <file>
import { isAdmin } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function GET() {
  if (!(await isAdmin())) return new Response("Sign in at /admin first.", { status: 401 });
  const clips = await getStore().list();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(clips, null, 2) + "\n", {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="shravanam-clips-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
