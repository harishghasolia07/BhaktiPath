"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import type { Clip } from "@/lib/clip-schema";
import { clipHref, langOf } from "@/lib/display";
import { requestAutoplay } from "@/lib/local";
import { formatLength, formatTime, thumbnailUrl } from "@/lib/youtube";

/** Phones: today's bhajan as one small card (the temple arch is for bigger screens). */
export function TodayStrip({ clip }: { clip: Clip }) {
  return (
    <Link
      href={clipHref(clip)}
      onClick={() => requestAutoplay(clip.slug)}
      aria-label={`Play today's bhajan: ${clip.title}`}
      className="flex shrink-0 items-center gap-3 rounded-[10px] border border-gold/40 bg-shyam/70 p-2 pr-3 no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnailUrl(clip.videoId, "hq")} alt="" className="aspect-video w-[6.5rem] shrink-0 rounded-[6px] object-cover" />
      <span className="min-w-0 flex-1">
        <span lang="hi" className="block font-display text-[0.95rem] leading-none text-gold">
          आज का भजन
        </span>
        <span lang={langOf(clip.title)} className="mt-1 line-clamp-2 block font-serif text-[1.05rem] leading-snug text-ivory">
          {clip.title}
        </span>
        <span className="tabular block text-[0.8rem] text-sandal">
          {formatTime(clip.start)} – {formatTime(clip.end)} · {formatLength(clip.end - clip.start)}
        </span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marigold text-velvet-deep">
        <Play className="size-4 fill-current" aria-hidden="true" />
      </span>
    </Link>
  );
}
