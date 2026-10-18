"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Search, X } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Clip } from "@/lib/clip-schema";
import { clipHref, groupByVideo, langOf } from "@/lib/display";
import { requestAutoplay, useFavs, usePlayed } from "@/lib/local";
import { matchesQuery } from "@/lib/translit";
import { formatLength, formatTime } from "@/lib/youtube";
import { HeartButton } from "./HeartButton";
import { Diya } from "./ornaments";

type Filter = "all" | Category | "fav";
const FILTERS: Filter[] = ["all", ...CATEGORIES, "fav"];

export function Board({ clips }: { clips: Clip[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const played = usePlayed();
  const [favs] = useFavs();
  const panelId = useId();

  // Keep the section and search in the address bar, so a filtered board can be shared.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("s");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL after hydration
    if (s && (FILTERS as string[]).includes(s)) setFilter(s as Filter);
    const query = p.get("q");
    if (query) setQ(query);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("s", filter);
    if (q.trim()) p.set("q", q.trim());
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [filter, q]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: clips.length, bhajan: 0, kirtan: 0, katha: 0, fav: 0 };
    for (const clip of clips) {
      c[clip.category]++;
      if (favs.has(clip.slug)) c.fav++;
    }
    return c;
  }, [clips, favs]);

  const groups = useMemo(() => {
    const shown = clips.filter(
      (c) =>
        (filter === "all" || (filter === "fav" ? favs.has(c.slug) : c.category === filter)) &&
        matchesQuery(`${c.title} ${c.tags.join(" ")}`, q),
    );
    return groupByVideo(shown);
  }, [clips, filter, q, favs]);

  return (
    <section
      aria-labelledby="board-title"
      className="rounded-[5px] bg-[linear-gradient(160deg,#f2cf72,#b8862b_45%,#6e4a10)] p-[7px] shadow-[0_24px_48px_-14px_rgb(0_0_0/0.65)] lg:flex lg:h-[var(--fit-h)] lg:flex-col"
      data-may-scroll
    >
      <div className="rounded-[2px] bg-shyam shadow-[inset_0_0_0_1px_rgb(0_0_0/0.35)] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-gold/40 px-4 pb-3 pt-4 sm:px-5">
        <h2 id="board-title" className="flex items-baseline gap-3 leading-none">
          <span lang="hi" className="font-display text-[1.9rem] text-gold">
            दर्शन समय
          </span>
          <span className="text-[0.95rem] text-sandal">Darshan timings</span>
        </h2>
        <p className="text-[0.85rem] uppercase tracking-[0.14em] text-mist">
          {clips.length} {clips.length === 1 ? "clip" : "clips"} · times in the katha
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-1 pt-4 sm:px-5">
        <div role="tablist" aria-label="Sections" className="flex flex-wrap gap-1.5 sm:gap-2">
          {FILTERS.map((f) => {
            const on = f === filter;
            const label = f === "all" ? { en: "All" } : f === "fav" ? { en: "My bhajans" } : CATEGORY_LABELS[f];
            return (
              <button
                key={f}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={panelId}
                onClick={() => setFilter(f)}
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-gold/45 px-3.5 text-[0.95rem] sm:gap-2 sm:px-4 sm:text-[0.98rem] font-semibold text-sandal transition-colors hover:border-gold hover:text-ivory aria-selected:border-gold aria-selected:bg-gold aria-selected:text-shyam"
              >
                {f === "fav" ? (
                  <>
                    <Heart className={`size-4 ${on ? "fill-current" : ""}`} aria-hidden="true" />
                    <span className="sr-only">{label.en}</span>
                  </>
                ) : (
                  label.en
                )}
                <span className={`tabular text-[0.8rem] font-medium max-[479px]:hidden ${on ? "text-shyam/70" : "text-mist/80"}`}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
        <label className="relative block">
          <span className="sr-only">Search bhajans</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-mist" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by bhajan name"
            className="h-11 w-full rounded-full border border-gold/30 bg-shyam-lit pl-10 pr-10 text-ivory placeholder:text-mist/80 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-mist hover:text-ivory"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        tabIndex={0}
        aria-label="Clips"
        className="px-2 pb-3 sm:px-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-gutter:stable]"
      >
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-mist">
            {clips.length === 0
              ? "No clips yet. The first darshan will appear here."
              : filter === "fav" && !q.trim()
                ? "Tap the heart on a bhajan to keep it here."
                : `Nothing matches “${q.trim()}”${filter !== "all" && filter !== "fav" ? ` in ${CATEGORY_LABELS[filter as Category].en}` : ""}.`}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.videoId} className="mt-3">
              <h3 className="flex items-center gap-3 px-2 pb-1 text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-gold/90">
                <Link href={g.href} className="text-gold/90 no-underline hover:text-marigold hover:underline">
                  {g.label}
                </Link>
                <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
              </h3>
              <ol>
                {g.clips.map((c) => {
                  const lit = played.has(c.slug);
                  return (
                    <li key={c.slug} className="relative">
                      <Link
                        href={clipHref(c)}
                        onClick={() => requestAutoplay(c.slug)}
                        className="group grid grid-cols-[22px_1fr] items-baseline gap-x-2.5 gap-y-0.5 rounded-[3px] py-2.5 pl-1.5 pr-11 no-underline transition-colors hover:bg-shyam-lit sm:grid-cols-[24px_8.4rem_1fr_auto] sm:gap-x-3 sm:pl-2 sm:pr-12"
                      >
                        <Diya lit={lit} className="row-span-2 size-[22px] self-start sm:row-span-1 sm:size-6" />
                        <span className="tabular text-[0.84rem] font-semibold text-gold sm:text-[0.98rem]">
                          {formatTime(c.start)} – {formatTime(c.end)}
                        </span>
                        <span className="col-start-2 min-w-0 sm:col-start-auto">
                          <span lang={langOf(c.title)} className="block font-serif text-[1.15rem] leading-snug text-pretty text-ivory group-hover:text-marigold sm:text-[1.2rem]">
                            {c.title}
                          </span>
                          {filter === "all" && (
                            <span className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-mist">
                              {CATEGORY_LABELS[c.category].en}
                              {c.sample ? " · sample" : ""}
                            </span>
                          )}
                        </span>
                        <span className="tabular hidden text-[0.9rem] text-mist sm:block">{formatLength(c.end - c.start)}</span>
                      </Link>
                      <HeartButton slug={c.slug} title={c.title} className="absolute right-0.5 top-1.5 size-10" />
                    </li>
                  );
                })}
              </ol>
            </div>
          ))
        )}
      </div>
      </div>
    </section>
  );
}
