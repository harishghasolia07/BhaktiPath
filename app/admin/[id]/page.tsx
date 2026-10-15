import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ClipEditor } from "@/components/admin/ClipEditor";
import { isAdmin } from "@/lib/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Edit clip" };

export default function EditClipPage(props: PageProps<"/admin/[id]">) {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pt-6 sm:px-6">
      <Suspense fallback={<p className="text-sandal">Loading…</p>}>
        <Gate params={props.params} />
      </Suspense>
    </main>
  );
}

async function Gate({ params }: { params: PageProps<"/admin/[id]">["params"] }) {
  if (!(await isAdmin())) redirect("/admin");
  const { id } = await params;
  const clip = await getStore().getById(id);
  if (!clip) notFound();
  const existing = (await getStore().list()).map(({ id, title, videoId, start, end }) => ({ id, title, videoId, start, end }));
  return <ClipEditor clip={clip} existing={existing} />;
}
