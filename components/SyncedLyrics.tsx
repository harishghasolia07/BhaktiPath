"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { activeLine, type LyricLine } from "@/lib/lyrics";
import type { LyricsSource } from "@/lib/lyrics-store";
import { useAccount } from "@/lib/account-client";

/** 13 → "१३" for the verse marker. */
const DEV_DIGITS = "०१२३४५६७८९";
const devNum = (n: number) => String(n).split("").map((d) => DEV_DIGITS[Number(d)] ?? d).join("");

/* ---------- loading: once per clip and sign-in state, shared by every component that asks ---------- */
export type SyncedLyricsData = { lines: LyricLine[]; source: LyricsSource };
const cache = new Map<string, SyncedLyricsData | "loading">();
/** One shared empty value: a snapshot must be the same object every time, or React loops. */
const NONE: LyricLine[] = [];
const EMPTY: SyncedLyricsData = { lines: NONE, source: "youtube-auto" };
const listeners = new Set<() => void>();
function load(key: string, slug: string) {
  if (cache.has(key)) return;
  cache.set(key, "loading");
  fetch(`/api/lyrics/${encodeURIComponent(slug)}`)
    .then((r) => (r.ok ? (r.json() as Promise<SyncedLyricsData>) : EMPTY))
    .then((d) => cache.set(key, { lines: d.lines ?? [], source: d.source ?? "youtube-auto" }))
    .catch(() => cache.set(key, EMPTY))
    .finally(() => listeners.forEach((l) => l()));
}

/** The clip's synced lyrics: null while loading, no lines when it has none. Own (private) videos have none. */
export function useSyncedLyrics(slug: string, enabled = true): SyncedLyricsData | null {
  const acct = useAccount();
  const ready = acct.status !== "loading";
  // Signed out the API returns the words with no times; signed in it returns times relative to the clip.
  // Keying by both means signing in during the same visit fetches the timed version.
  const key = `${slug}:${acct.status === "in" ? "in" : "out"}`;
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (enabled ? (ready ? cache.get(key) : undefined) : EMPTY),
    () => undefined,
  );
  useEffect(() => {
    if (enabled && ready) load(key, slug);
  }, [key, slug, enabled, ready]);
  if (!enabled) return EMPTY;
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
  source = "youtube-auto",
}: {
  lines: LyricLine[];
  /** seconds into the video */
  now: number;
  /** this page's player is playing this clip (otherwise nothing is highlighted) */
  live: boolean;
  onSeek?: (t: number) => void;
  lang?: string;
  /** "manual" is the owner's exact text, kept instead of the auto-captions */
  source?: LyricsSource;
}) {
  const box = useRef<HTMLDivElement>(null);
  const handScrollAt = useRef(0);
  const [following, setFollowing] = useState(true);
  const idx = live ? activeLine(lines, now) : -1;

  // Keep the current line just under the top of the box: one sung line stays in view above it, and the
  // upcoming lines fill the space below, so the singing is visible instead of sinking to the bottom edge.
  useEffect(() => {
    const el = box.current;
    if (!el || idx < 0 || !following) return;
    const line = el.querySelector<HTMLElement>(`[data-line="${idx}"]`);
    if (!line) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: line.offsetTop - el.clientHeight * 0.27, behavior: reduce ? "auto" : "smooth" });
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
        data-footer-quiet
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
                  {l.verse !== undefined && (
                    <span className="mb-0.5 block text-[0.72rem] font-semibold tracking-[0.12em] text-gold/75">
                      ॥ {devNum(l.verse)} ॥
                    </span>
                  )}
                  <span className="block">{l.text}</span>
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
      <p className="border-t border-gold/20 px-4 py-1.5 text-[0.75rem] text-mist/80">
        {source === "manual"
          ? "Exact lyrics, synchronized to the recording."
          : "From YouTube's auto-captions: some words may be wrong."}
        {onSeek ? " Tap a line to jump there." : ""}
      </p>
    </div>
  );
}
