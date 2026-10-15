import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClipEditor } from "@/components/admin/ClipEditor";
import { isAdmin } from "@/lib/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Add a clip" };

export default function NewClipPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pt-6 sm:px-6">
      <Suspense fallback={<p className="text-sandal">Loading…</p>}>
        <Gate />
      </Suspense>
    </main>
  );
}

async function Gate() {
  if (!(await isAdmin())) redirect("/admin");
  const existing = (await getStore().list()).map(({ id, title, videoId, start, end }) => ({ id, title, videoId, start, end }));
  return <ClipEditor existing={existing} />;
}
