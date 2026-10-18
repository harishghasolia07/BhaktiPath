// Admin-only JSON backup of people and the videos they added (never passwords). Atlas's free tier has no backups.
import { getAccounts } from "@/lib/accounts";
import { isAdmin } from "@/lib/session";

export async function GET() {
  if (!(await isAdmin())) return new Response("Sign in at /admin first.", { status: 401 });
  const data = await getAccounts().exportAll();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2) + "\n", {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="shravanam-accounts-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
