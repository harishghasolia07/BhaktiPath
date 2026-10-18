import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, Play } from "lucide-react";
import { ClipCard } from "@/components/ClipCard";
import { PlaylistManager, type Row } from "@/components/playlists/PlaylistManager";
import { getAccounts } from "@/lib/accounts";
import { getStore } from "@/lib/store";
import { visibleKeys } from "@/lib/playlists";
import { currentUser } from "@/lib/user-session";

export const metadata: Metadata = { title: "Playlist", robots: { index: false } };

export default function PlaylistPage(props: PageProps<"/playlists/[id]">) {
  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pb-10 pt-6 sm:px-6">
      <Suspense fallback={<p className="text-sandal">Loading…</p>}>
        <Body params={props.params} />
      </Suspense>
    </main>
  );
}

async function Body({ params }: { params: PageProps<"/playlists/[id]">["params"] }) {
  const { id } = await params;
  const user = await currentUser(); // first: it marks the page as per-request
  const list = await getAccounts().getPlaylist(id);
  if (!list) notFound();
  const isOwner = user?.id === list.ownerId;
  if (!isOwner && !list.public) notFound(); // a private playlist doesn't exist for anyone else

  const keys = visibleKeys(list.items, isOwner);
  const own = isOwner ? new Map((await getAccounts().listVideos(list.ownerId)).map((v) => [v.slug, v])) : new Map();
  const store = getStore();
  const rows: Row[] = await Promise.all(keys.map(async (key) => ({ key, clip: own.get(key) ?? (key.startsWith("my-") ? null : await store.getBySlug(key)) })));

  if (isOwner) {
    return (
      <div className="flex flex-col gap-5">
        <Link href={`/kathas?k=pl:${list.id}`} className="inline-flex w-fit items-center gap-1 text-sandal no-underline hover:text-ivory">
          <ChevronLeft className="size-4" aria-hidden="true" /> Back to the library
        </Link>
        <h1 className="sr-only">Playlist: {list.name}</h1>
        <PlaylistManager id={list.id} name={list.name} isPublic={list.public} rows={rows} />
      </div>
    );
  }

  const owner = await getAccounts().getUser(list.ownerId);
  const clips = rows.flatMap((r) => (r.clip ? [r.clip] : []));
  const first = clips[0];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[clamp(1.9rem,1.4rem+1.5vw,2.6rem)] leading-tight text-ivory">{list.name}</h1>
        <p className="mt-1 text-sandal">
          A playlist{owner ? ` by ${owner.name.split(" ")[0]}` : ""} · {clips.length} {clips.length === 1 ? "bhajan" : "bhajans"}
        </p>
      </div>
      {first && (
        <Link
          href={`/clip/${first.slug}?play=1&slugs=${clips.slice(0, 80).map((c) => c.slug).join(",")}`}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-marigold px-5 font-semibold text-velvet-deep no-underline hover:bg-[#ffb32e]"
        >
          <Play className="size-4 fill-current" aria-hidden="true" /> Play all {clips.length}
        </Link>
      )}
      {clips.length === 0 ? (
        <p className="rounded-[8px] border border-gold/25 p-5 text-sandal">This playlist has no bhajans you can see.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] gap-x-5 gap-y-7 max-sm:grid-cols-1 max-sm:gap-y-4">
          {clips.map((c) => (
            <li key={c.slug} className="min-w-0">
              <ClipCard clip={c} lit={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
