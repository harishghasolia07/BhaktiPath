"use client";

import Link from "next/link";
import { CATEGORY_LABELS, type Clip } from "@/lib/clip-schema";
import { langOf } from "@/lib/display";
import { requestAutoplay } from "@/lib/local";
import { formatLength, formatTime, thumbnailUrl } from "@/lib/youtube";
import { HeartButton } from "./HeartButton";
import { Diya } from "./ornaments";

/** A small card for one clip: the katha's picture, its timing, the bhajan's name. */
export function ClipCard({ clip, lit }: { clip: Clip; lit: boolean }) {
  return (
    <div className="group/card relative flex w-full">
    <Link
      href={`/clip/${clip.slug}`}
      onClick={() => requestAutoplay(clip.slug)}
      className="group flex w-full flex-row overflow-hidden sm:flex-col rounded-[4px] border border-gold/30 bg-shyam no-underline shadow-[0_10px_22px_-12px_rgb(0_0_0/0.7)] transition-colors hover:border-marigold focus-visible:border-marigold"
    >
      <span className="relative block aspect-video w-[9.5rem] shrink-0 self-start overflow-hidden bg-[radial-gradient(80%_80%_at_50%_40%,#5c0d1a,#2c040b)] sm:w-full sm:self-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl(clip.videoId, "mq")}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-90 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <span className="tabular absolute bottom-2 right-2 hidden rounded-full bg-shyam/90 px-2.5 py-0.5 text-[0.8rem] font-semibold text-gold sm:block">
          {formatTime(clip.start)} – {formatTime(clip.end)}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5 pl-3 pr-11 sm:px-3 sm:pb-3 sm:pr-3">
        <Diya lit={lit} className="mt-0.5 hidden size-5 shrink-0 sm:block" />
        <span className="min-w-0">
          <span lang={langOf(clip.title)} className="block font-serif text-[1.08rem] leading-snug text-pretty text-ivory group-hover:text-marigold">
            {clip.title}
          </span>
          <span className="tabular mt-1 block text-[0.85rem] font-semibold text-gold sm:hidden">
            {formatTime(clip.start)} – {formatTime(clip.end)}
          </span>
          <span className="mt-0.5 block text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-mist">
            {CATEGORY_LABELS[clip.category].en} · {formatLength(clip.end - clip.start)}
            {clip.sample ? " · sample" : ""}
          </span>
        </span>
      </span>
    </Link>
    <HeartButton
      slug={clip.slug}
      title={clip.title}
      className="absolute right-1.5 top-1.5 z-10 size-9 bg-velvet/85 text-ivory backdrop-blur-[2px] hover:bg-velvet"
    />
    </div>
  );
}
