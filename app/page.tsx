import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Board } from "@/components/Board";
import { ContinueCard } from "@/components/ContinueCard";
import { Shrine, shrineMaxWidth } from "@/components/Shrine";
import { ShrineLink } from "@/components/ShrineLink";
import { TodayStrip } from "@/components/TodayStrip";
import { getClips } from "@/lib/clips";
import type { Clip } from "@/lib/clip-schema";
import { langOf, libraryHref, sourceLabel } from "@/lib/display";
import { formatLength, formatTime } from "@/lib/youtube";

/** A bhajan for today (India time): the same all day, a different one tomorrow. */
function bhajanOfTheDay(clips: Clip[]): Clip | undefined {
  const sung = clips.filter((c) => c.category !== "katha");
  const pool = sung.length ? sung : clips;
  const istDay = Math.floor((Date.now() + 5.5 * 3600_000) / 86_400_000);
  return pool[istDay % pool.length];
}

async function Featured({ clips }: { clips: Clip[] }) {
  await connection(); // today's date: this part is rendered per visit, the rest of the page stays cached
  const clip = bhajanOfTheDay(clips) ?? clips[0];
  return (
    <>
      <ShrineLink clip={clip} />
      <div className="flex w-full max-w-[34rem] flex-col items-center gap-1 text-center">
        <Link
          href={`/clip/${clip.slug}`}
          lang={langOf(clip.title)}
          className="font-serif text-[clamp(1.6rem,1.2rem+1.3vw,2.3rem)] leading-[1.15] text-ivory no-underline [text-wrap:balance] hover:text-marigold"
        >
          {clip.title}
        </Link>
        <p className="text-sandal">
          <span lang="hi" className="font-display text-[1.1rem] text-gold">
            आज का भजन
          </span>{" "}
          · <span className="tabular whitespace-nowrap text-gold">{formatTime(clip.start)} – {formatTime(clip.end)}</span> ·{" "}
          <span className="whitespace-nowrap">{formatLength(clip.end - clip.start)}</span>
        </p>
        <p className="text-[0.95rem] text-sandal/90">
          <Link href={libraryHref(clip, clip.videoId)} className="underline decoration-gold/40 hover:text-ivory hover:decoration-gold">
            {sourceLabel(clip)}
          </Link>{" "}
          · Katha by <span className="font-semibold text-gold">Pujya Shri Indresh Upadhyay Ji Maharaj</span>
        </p>
      </div>
    </>
  );
}

/** Phones: today's bhajan as a small strip. */
async function Today({ clips }: { clips: Clip[] }) {
  await connection(); // the date, as in Featured
  return <TodayStrip clip={bhajanOfTheDay(clips) ?? clips[0]} />;
}

export default async function Home() {
  const clips = await getClips();

  return (
    <main data-shell className="mx-auto grid w-full max-w-[1520px] grid-cols-[minmax(0,1fr)] items-start gap-x-8 gap-y-8 px-4 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pt-3 max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:gap-3 max-lg:pb-3 max-lg:pt-3">
      <h1 className="sr-only">Shravanam Kirtanam: bhajans, kirtans and katha from the Shrimad Bhagwat Katha</h1>
      {clips.length ? (
        <div className="min-w-0 flex-col items-center gap-3 max-lg:hidden lg:sticky lg:top-4 lg:flex">
          <Suspense
            fallback={
              <div className="w-full" style={{ maxWidth: shrineMaxWidth("9.5rem") }}>
                <Shrine open={false} />
              </div>
            }
          >
            <Featured clips={clips} />
          </Suspense>
          <ContinueCard clips={clips} />
        </div>
      ) : (
        <div className="rounded-[4px] border border-gold/30 p-8 text-center text-sandal max-lg:shrink-0">
          The first bhajan will appear here once it is added.
        </div>
      )}
      {clips.length > 0 && (
        <div className="w-full min-w-0 lg:hidden max-lg:[body:has([data-mini])_&]:hidden">
          <Suspense fallback={<div className="h-[4.75rem] rounded-[10px] border border-gold/20 bg-shyam/40" />}>
            <Today clips={clips} />
          </Suspense>
          <div className="mt-2 flex w-full min-w-0 justify-center empty:hidden">
            <ContinueCard clips={clips} />
          </div>
        </div>
      )}
      <Board clips={clips} />
    </main>
  );
}
