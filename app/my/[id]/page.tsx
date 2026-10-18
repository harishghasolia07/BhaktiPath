import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ClipStage } from "@/components/ClipStage";
import { getAccounts } from "@/lib/accounts";
import { currentUser } from "@/lib/user-session";

export const metadata: Metadata = { title: "My video", robots: { index: false } };

export default function MyVideoPage(props: PageProps<"/my/[id]">) {
  return (
    <main>
      <Suspense fallback={<div className="mx-auto w-full max-w-[1520px] px-4 pt-4 sm:px-6"><div className="aspect-video w-full max-w-[min(100%,calc((var(--fit-h)-7.25rem)*16/9))] animate-pulse rounded-t-[48%_56px] rounded-b-[14px] bg-brass/30" /></div>}>
        <Stage params={props.params} />
      </Suspense>
    </main>
  );
}

async function Stage({ params }: { params: PageProps<"/my/[id]">["params"] }) {
  const user = await currentUser();
  if (!user) redirect("/my");
  const { id } = await params;
  const videos = await getAccounts().listVideos(user.id);
  const video = videos.find((v) => v.id === id);
  if (!video) notFound();
  return <ClipStage key={video.id} queue={videos} initialSlug={video.slug} queueLabel="More of my videos" />;
}
