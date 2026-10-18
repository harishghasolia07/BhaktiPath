"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { activeLine, type LyricLine } from "@/lib/lyrics";

/* ---------- loading: once per clip, shared by every component that asks ---------- */
const cache = new Map<string, LyricLine[] | "loading">();
/** One shared empty list: a snapshot must be the same object every time, or React loops. */
const NONE: LyricLine[] = [];
const listeners = new Set<() => void>();
function load(slug: string) {
  if (cache.has(slug)) return;
  cache.set(slug, "loading");
  fetch(`/api/lyrics/${encodeURIComponent(slug)}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ lines: LyricLine[] }>) : { lines: [] }))
    .then((d) => cache.set(slug, d.lines ?? []))
    .catch(() => cache.set(slug, []))
    .finally(() => listeners.forEach((l) => l()));
}

/** The clip's synced lyrics: null while loading, [] when it has none. Own (private) videos have none. */
export function useSyncedLyrics(slug: string, enabled = true): LyricLine[] | null {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (enabled ? cache.get(slug) : NONE),
    () => undefined,
  );
  useEffect(() => {
    if (enabled) load(slug);
  }, [slug, enabled]);
  if (!enabled) return NONE;
  return value === undefined || value === "loading" ? null : value;
}

/**
 * Lyrics that follow the singing, like a music app: the line being sung is lit and kept in view, sung lines fade,
 * and a tap on any line jumps there. Scrolling by hand pauses the following for a few seconds.
 */
export function SyncedLyrics({
  lines,
  now,
  live,
  onSeek,
  lang,
}: {
  lines: LyricLine[];
  /** seconds into the video */
  now: number;
  /** this page's player is playing this clip (otherwise nothing is highlighted) */
  live: boolean;
  onSeek?: (t: number) => void;
  lang?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const handScrollAt = useRef(0);
  const [following, setFollowing] = useState(true);
  const idx = live ? activeLine(lines, now) : -1;

  // keep the current line a little above the middle of the box
  useEffect(() => {
    const el = box.current;
    if (!el || idx < 0 || !following) return;
    const line = el.querySelector<HTMLElement>(`[data-line="${idx}"]`);
    if (!line) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: line.offsetTop - el.clientHeight * 0.38, behavior: reduce ? "auto" : "smooth" });
  }, [idx, following]);

  // after a hand scroll, follow again on its own after 5 seconds
  useEffect(() => {
    if (following) return;
    const t = window.setInterval(() => {
      if (Date.now() - handScrollAt.current > 5000) setFollowing(true);
    }, 1000);
    return () => window.clearInterval(t);
  }, [following]);

  const byHand = () => {
    handScrollAt.current = Date.now();
    if (following && live) setFollowing(false);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={box}
        lang={lang}
        tabIndex={0}
        aria-label="Lyrics, following the singing"
        onWheel={byHand}
        onTouchMove={byHand}
        onKeyDown={(e) => ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key) && byHand()}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [container-type:size] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_80%,transparent)] focus-visible:outline-none sm:px-5"
      >
        <ol className="flex flex-col gap-1.5 py-[38cqh]">
          {lines.map((l, i) => {
            const state = i === idx ? "now" : i < idx ? "past" : "next";
            return (
              <li key={`${l.t}-${i}`} data-line={i}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault() /* a click shouldn't move focus (and scroll the frame) */}
                  onClick={() => onSeek?.(l.t)}
                  disabled={!onSeek}
                  aria-current={state === "now" ? "true" : undefined}
                  className={[
                    "block w-full origin-left rounded-[6px] px-2 py-1 text-left font-serif leading-snug transition-[color,transform,opacity] duration-300 ease-out enabled:hover:bg-shyam-lit/60 disabled:cursor-default",
                    l.spoken ? "text-[1rem] italic" : "text-[1.3rem] sm:text-[1.4rem]",
                    state === "now"
                      ? "scale-[1.04] text-gold [text-shadow:0_0_22px_rgb(242_157_22/0.45)]"
                      : state === "past"
                        ? "text-ivory/35"
                        : l.spoken
                          ? "text-mist/60"
                          : "text-ivory/75",
                  ].join(" ")}
                >
                  {l.text}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {live && !following && (
        <button
          type="button"
          onClick={() => setFollowing(true)}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-marigold px-4 py-1.5 text-[0.9rem] font-semibold text-velvet-deep shadow-[0_8px_18px_-6px_rgb(0_0_0/0.7)]"
        >
          Back to the singing
        </button>
      )}
      <p className="border-t border-gold/20 px-4 py-1.5 text-[0.75rem] text-mist/80">From YouTube&apos;s auto-captions: some words may be wrong. Tap a line to jump there.</p>
    </div>
  );
}
