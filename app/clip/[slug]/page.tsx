import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClipStage } from "@/components/ClipStage";
import { getClip, getClips } from "@/lib/clips";
import { getStore } from "@/lib/store";
import { CATEGORY_LABELS, sectionsText } from "@/lib/clip-schema";
import { kathaQueue } from "@/lib/katha";
import { formatLength, thumbnailUrl } from "@/lib/youtube";

/** Cached lookup first; a miss checks the database directly, so a clip added a moment ago never shows "not found". */
async function findClip(slug: string) {
  return (await getClip(slug)) ?? (await getStore().getBySlug(slug));
}

export async function generateStaticParams() {
  const clips = await getClips();
  // Cache Components needs at least one param at build time.
  return clips.length ? clips.map((c) => ({ slug: c.slug })) : [{ slug: "__none" }];
}

export async function generateMetadata({ params }: PageProps<"/clip/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const clip = await findClip(slug);
  if (!clip) return { title: "Clip not found" };
  const description = `${sectionsText(clip)} · ${formatLength(clip.end - clip.start)} · Pujya Shri Indresh Upadhyay Ji Maharaj`;
  const image = { url: thumbnailUrl(clip.videoId, "hq"), width: 480, height: 360, alt: clip.title };
  return {
    title: clip.title,
    description,
    alternates: { canonical: `/clip/${clip.slug}` },
    openGraph: { title: clip.title, description, url: `/clip/${clip.slug}`, images: [image] },
    twitter: { card: "summary_large_image", title: clip.title, description, images: [image.url] },
  };
}

async function Stage({ params, search }: { params: PageProps<"/clip/[slug]">["params"]; search: PageProps<"/clip/[slug]">["searchParams"] }) {
  const { slug } = await params;
  const [clip, clips, sp] = await Promise.all([findClip(slug), getClips(), search]);
  // An unknown address shows the "not here" page. (Its status can't be 404: clips added after a
  // deploy must open on demand, so Next serves every address before it knows whether it exists.)
  if (!clip) notFound();
  // "Play all" from the library: the clips of that view, in the order it showed them.
  if (sp.play) {
    const raw = Array.isArray(sp.slugs) ? sp.slugs[0] : sp.slugs;
    const bySlug = new Map(clips.map((c) => [c.slug, c]));
    const view = (raw ?? "")
      .split(",")
      .slice(0, 80)
      .map((s) => bySlug.get(s))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    if (view.length > 1 && view.some((c) => c.slug === clip.slug)) {
      return <ClipStage key={clip.slug} queue={view} initialSlug={clip.slug} queueLabel={`Playing all ${view.length}`} />;
    }
  }
  return (
    <ClipStage
      key={clip.slug}
      queue={kathaQueue(clips, clip)}
      initialSlug={clip.slug}
      queueLabel={`Next in ${CATEGORY_LABELS[clip.categories[0]].en}`}
    />
  );
}

export default function ClipPage(props: PageProps<"/clip/[slug]">) {
  return (
    <main>
      <Suspense fallback={<StageFallback />}>
        <Stage params={props.params} search={props.searchParams} />
      </Suspense>
    </main>
  );
}

function StageFallback() {
  return (
    <div className="mx-auto w-full max-w-[1520px] px-4 pt-4 sm:px-6">
      <div className="aspect-video w-full max-w-[min(100%,calc((var(--fit-h)-7.25rem)*16/9))] animate-pulse rounded-t-[48%_56px] rounded-b-[14px] bg-brass/30" />
    </div>
  );
}
