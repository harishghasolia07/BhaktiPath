import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { MyDeleteButton } from "@/components/my/MyDeleteButton";
import { MyVideoForm } from "@/components/my/MyVideoForm";
import { getAccounts } from "@/lib/accounts";
import { currentUser } from "@/lib/user-session";

export const metadata: Metadata = { title: "Edit my video", robots: { index: false } };

export default function EditMyVideoPage(props: PageProps<"/my/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pb-10 pt-6 sm:px-6">
      <Suspense fallback={<p className="text-sandal">Loading…</p>}>
        <Body params={props.params} />
      </Suspense>
    </main>
  );
}

async function Body({ params }: { params: PageProps<"/my/[id]/edit">["params"] }) {
  const user = await currentUser();
  if (!user) redirect("/my");
  const { id } = await params;
  const video = await getAccounts().getVideo(user.id, id);
  if (!video) notFound();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/my/${video.id}`} className="grid size-10 place-items-center rounded-full text-sandal hover:bg-shyam-lit" aria-label="Back to the video">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="font-serif text-[1.9rem] text-ivory">Edit video</h1>
      </div>
      <MyVideoForm video={video} />
      <div className="border-t border-gold/20 pt-5">
        <MyDeleteButton id={video.id} title={video.title} />
      </div>
    </div>
  );
}
