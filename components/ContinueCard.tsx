"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import type { Clip } from "@/lib/clip-schema";
import { clipHref, langOf } from "@/lib/display";
import { requestAutoplay, requestResumeAt, useResume } from "@/lib/local";
import { resumeOffer } from "@/lib/resume";
import { formatTime } from "@/lib/youtube";

/** "Continue" the bhajan you were in the middle of on this device. Shows nothing if there isn't one. */
export function ContinueCard({ clips }: { clips: Clip[] }) {
  const r = useResume();
  const clip = r ? clips.find((c) => c.slug === r.slug) : undefined;
  const t = r ? resumeOffer(r, clip) : null; // only on the device, after the page is up (it reads the clock)
  if (!clip || t === null) return null;
  return (
    <Link
      href={clipHref(clip)}
      onClick={() => {
        requestAutoplay(clip.slug);
        requestResumeAt(clip.slug, t);
      }}
      className="flex w-full max-w-[34rem] shrink-0 items-center gap-3 rounded-full border border-gold/40 px-3 py-1.5 text-left no-underline hover:border-gold"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-marigold text-velvet-deep">
        <Play className="size-3.5 fill-current" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold">Continue · from {formatTime(t)}</span>
        <span lang={langOf(clip.title)} className="block truncate font-serif text-[1rem] text-ivory">
          {clip.title}
        </span>
      </span>
    </Link>
  );
}
