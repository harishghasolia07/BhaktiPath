"use client";

import Link from "next/link";
import { sectionsText, type Clip } from "@/lib/clip-schema";
import { clipHref, langOf } from "@/lib/display";
import { requestAutoplay, useIsNew } from "@/lib/local";
import { formatLength, thumbnailUrl } from "@/lib/youtube";
import { ClipMenu } from "./ClipMenu";
import { HeartButton } from "./HeartButton";

/**
 * A clip card laid out like YouTube's: a big rounded 16:9 picture with the timing on it, the
 * name and details underneath, no box. On phones it is a compact row (picture left, text right).
 */
export function ClipCard({ clip, lit }: { clip: Clip; lit: boolean }) {
  const fresh = useIsNew()(clip.createdAt) && !lit && !clip.owner;
  return (
    <div className="group/card relative w-full">
      <ClipMenu clip={clip} className="absolute bottom-0 right-0 z-10 size-9 max-sm:right-1" />
      <Link
        href={clipHref(clip)}
        onClick={() => requestAutoplay(clip.slug)}
        className="group block w-full no-underline max-sm:flex max-sm:flex-row max-sm:gap-3"
      >
        {/* A 16:9 box that never stretches: YouTube thumbnails are 16:9, so the whole picture shows. */}
        <span className="relative block aspect-video w-full overflow-hidden rounded-[12px] border border-gold/25 bg-[radial-gradient(80%_80%_at_50%_40%,#5c0d1a,#2c040b)] transition-colors group-hover:border-marigold max-sm:w-[clamp(6.5rem,32vw,9.5rem)] max-sm:shrink-0 max-sm:self-start max-sm:rounded-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl(clip.videoId, "hq")}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          {fresh && (
            <span className="absolute left-2 top-2 rounded-md bg-marigold px-1.5 py-0.5 text-[0.7rem] font-bold uppercase leading-none tracking-wider text-velvet-deep max-sm:left-1 max-sm:top-1">New</span>
          )}
          {lit && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-marigold max-sm:hidden" aria-hidden="true" />
          )}
        </span>
        <span className="block min-w-0 flex-1 pr-10 pt-3 max-sm:py-0.5">
          <span lang={langOf(clip.title)} className="block font-serif text-[1.08rem] leading-snug text-pretty text-ivory group-hover:text-marigold">
            {clip.title}
          </span>
          <span className="mt-1 block text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-mist">
            {sectionsText(clip)} · {formatLength(clip.end - clip.start)}
            {lit ? " · played" : ""}
            {clip.sample ? " · sample" : ""}
          </span>
        </span>
      </Link>
      {!clip.owner && <HeartButton
        slug={clip.slug}
        title={clip.title}
        className="absolute right-2 top-2 z-10 size-9 bg-velvet/85 text-ivory backdrop-blur-[2px] hover:bg-velvet max-sm:right-1.5 max-sm:top-1.5"
      />}
    </div>
  );
}
