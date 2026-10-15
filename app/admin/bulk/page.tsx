import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BulkEditor } from "@/components/admin/BulkEditor";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Add many clips" };

export default function BulkPage() {
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
  return <BulkEditor />;
}
