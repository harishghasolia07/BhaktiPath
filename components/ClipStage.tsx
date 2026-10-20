"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, ListMusic, Moon, Pause, Play, Repeat, Repeat1, RotateCcw, Settings, Share2 } from "lucide-react";
import type { Clip } from "@/lib/clip-schema";
import { sectionsHi, sectionsText } from "@/lib/clip-schema";
import { clipHref, langOf } from "@/lib/display";
import { takeAutoplay, usePlayed, usePref } from "@/lib/local";
import { formatLength, formatTime, thumbnailUrl, youtubeAtUrl } from "@/lib/youtube";
import { ClipMenu } from "./ClipMenu";
import { HeartButton } from "./HeartButton";
import { usePlayer, type Sleep } from "./PlayerProvider";
import { Diya } from "./ornaments";
import { Scrubber } from "./Scrubber";
import { Shrine, shrineMaxWidth } from "./Shrine";
import { SyncedLyrics, useSyncedLyrics } from "./SyncedLyrics";

type Props = { queue: Clip[]; initialSlug: string; queueLabel: string };
type Tab = "next" | "lyrics";

export function ClipStage({ queue, initialSlug, queueLabel }: Props) {
  const p = usePlayer();
  const me = useId();
  const pageClip = queue.find((c) => c.slug === initialSlug) ?? queue[0];
  // This page "owns" the shared player when the bhajan playing was started here (or arrived here).
  const mine = p.current !== null && p.owner === me;
  const clip = mine ? p.current! : pageClip;
  const list = mine ? p.queue : queue;
  const idx = Math.max(0, list.findIndex((c) => c.slug === clip.slug));
  const open = mine && p.open;
  const playing = mine && p.playing;
  const now = mine ? p.now : clip.start;
  const error = mine ? p.error : null;
  const ended = mine && p.ended;
  const sleep = mine ? p.sleep : null;

  const [sleepMenu, setSleepMenu] = useState<HTMLElement | null>(null);
  const [tabSel, setTabSel] = useState<{ slug: string; tab: Tab } | null>(null);
  const [autoNext, setAutoNext] = usePref("autonext", true);
  const played = usePlayed();
  const slotRef = useRef<HTMLDivElement>(null);
  const pRef = useRef(p);
  const actions = useRef({ togglePlay: () => {}, seekBy: (_: number) => {}, nextClip: () => {}, toggleLoop: () => {} });

  useEffect(() => {
    pRef.current = p;
  });

  // Arriving on the page of the bhajan already playing (e.g. from the mini player): take it back.
  // A tap on this site's board asks for the pat to open straight away.
  useEffect(() => {
    const pl = pRef.current;
    if (pl.current?.slug === initialSlug) pl.adopt(me);
    else if (takeAutoplay(initialSlug)) pl.play(queue, initialSlug, me);
  }, [initialSlug, me, queue]);

  // While this page owns the player, it sits over the shrine's opening; leaving makes it a mini player.
  useEffect(() => {
    if (!mine || !slotRef.current) return;
    return pRef.current.registerSlot(slotRef.current, me);
  }, [mine, me]);

  const next = idx + 1 < list.length ? list[idx + 1] : null;
  // What follows this clip, wrapping round to the start.
  const upNext = [...list.slice(idx + 1), ...list.slice(0, idx)];
  const length = clip.end - clip.start;
  const elapsed = Math.min(Math.max(now - clip.start, 0), length);

  function openDarshan() {
    if (mine) p.restart();
    else p.play(queue, initialSlug, me);
  }
  function togglePlay() {
    if (mine) p.toggle();
    else openDarshan();
  }
  function playClip(slug: string) {
    if (mine) p.goTo(slug);
    else p.play(queue, slug, me);
  }

  // Close the sleep menu on Escape or a tap elsewhere.
  useEffect(() => {
    if (!sleepMenu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as HTMLElement).closest("[data-sleep]")) setSleepMenu(null);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", close);
    };
  }, [sleepMenu]);

  // Keyboard: Space/K play-pause, ←/→ 5 seconds, N next, L repeat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable=true]")) return;
      const onControl = t.closest("button,a,[role=slider],[role=tab],[role=menuitem]");
      const key = e.key.toLowerCase();
      if (key === " " || key === "k") {
        if (key === " " && onControl) return; // Space presses a focused button
        e.preventDefault();
        actions.current.togglePlay();
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !t.closest("[role=slider]")) {
        e.preventDefault();
        actions.current.seekBy(e.key === "ArrowRight" ? 5 : -5);
      } else if (key === "n") actions.current.nextClip();
      else if (key === "l") actions.current.toggleLoop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function startSleep(s: Sleep) {
    if (!mine) openDarshan();
    p.setSleep(s);
    setSleepMenu(null);
    p.flash(s === null ? "Sleep timer off" : s.kind === "end" ? "Will stop after this bhajan" : `Will pause in ${s.minutes} minutes`);
  }

  const [shown, setShown] = useState<number | null>(null); // while dragging the bar, the label follows the finger
  const labelTime = shown ?? elapsed;

  async function share() {
    const url = `${window.location.origin}/clip/${clip.slug}`;
    const data = { title: clip.title, text: `${clip.title} · Shravanam Kirtanam`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      p.flash("Link copied");
    } catch (err) {
      if ((err as Error).name !== "AbortError") p.flash("Couldn't share. Copy the address bar instead.");
    }
  }

  useEffect(() => {
    actions.current = {
      togglePlay,
      seekBy: (sec) => (mine ? pRef.current.seekBy(sec) : undefined),
      nextClip: () => (next ? playClip(next.slug) : undefined),
      toggleLoop: () => pRef.current.cycleRepeat(),
    };
  });

  const synced = useSyncedLyrics(clip.slug, !clip.owner);
  const hasSynced = Boolean(synced && synced.length);
  const hasLyrics = hasSynced || Boolean(clip.lyrics);
  const tabNow: Tab = tabSel?.slug === clip.slug ? tabSel.tab : hasLyrics ? "lyrics" : "next";
  const showLyrics = hasLyrics && tabNow === "lyrics";

  return (
    <div className="mx-auto grid w-full max-w-[1520px] gap-x-8 gap-y-6 px-4 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:pt-2 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* ---------- the shrine ---------- */}
      <div className="flex min-w-0 flex-col items-center gap-3 lg:items-start">
        <div className="w-full" style={{ maxWidth: shrineMaxWidth("4.5rem") }}>
          <Shrine
            open={open}
            behind={
              <>
                {!open && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailUrl(clip.videoId, "hq")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                )}
                {/* the site-wide player sits over this spot while the bhajan is open */}
                <div ref={slotRef} className="absolute inset-0" />
              </>
            }
          >
            {!open && (
              <button
                type="button"
                onClick={openDarshan}
                className="absolute inset-0 flex cursor-pointer items-center justify-center pt-[4%]"
                aria-label={`Play ${clip.title}`}
              >
                <span className="flex items-center gap-2.5 rounded-full border border-gold/80 bg-shyam/90 px-5 py-2.5 text-[1.05rem] font-semibold text-ivory shadow-[0_8px_20px_rgb(0_0_0/0.45)] transition-transform duration-300 ease-out hover:scale-[1.04]">
                  <PlayGlyph />
                  {ended ? "Darshan again" : "Open the darshan"}
                </span>
              </button>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-velvet-deep/95 p-6 text-center">
                <p className="max-w-[40ch] text-ivory">{error}</p>
                <a
                  className="inline-flex items-center gap-2 rounded-full border border-gold/70 px-4 py-2 text-gold"
                  href={youtubeAtUrl(clip.videoId, clip.start)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open on YouTube <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </Shrine>
        </div>

        {/* ---------- clip controls ---------- */}
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2" style={{ maxWidth: shrineMaxWidth("4.5rem") }}>
          <Scrubber length={length} elapsed={elapsed} enabled={mine} onCommit={(t) => p.seekTo(clip.start + t)} onPreview={setShown} />
          <span className="tabular min-w-[5.5rem] text-right text-[0.95rem] text-sandal">
            {formatTime(labelTime)} / {formatTime(length)}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 max-[379px]:gap-1">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              title={playing ? "Pause" : "Play"}
              className="grid size-12 place-items-center rounded-full bg-marigold text-velvet-deep shadow-[0_6px_14px_-4px_rgb(0_0_0/0.6)] transition-colors hover:bg-[#ffb32e]"
            >
              {playing ? (
                <Pause className="size-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
              )}
            </button>
            <IconToggle label="Play from the start" onClick={openDarshan}>
              <RotateCcw className="size-[18px]" aria-hidden="true" />
            </IconToggle>
            <IconToggle
              label={p.repeat === "off" ? "Repeat: off" : p.repeat === "all" ? "Repeat: the whole list" : "Repeat: this bhajan"}
              pressed={p.repeat !== "off"}
              onClick={p.cycleRepeat}
            >
              {p.repeat === "one" ? <Repeat1 className="size-[18px]" aria-hidden="true" /> : <Repeat className="size-[18px]" aria-hidden="true" />}
            </IconToggle>
            <button
              type="button"
              title="Playback speed"
              aria-label={`Playback speed ${p.rate}×. Tap to change`}
              onClick={p.cycleRate}
              className="tabular grid h-11 min-w-11 place-items-center max-[379px]:h-10 max-[379px]:min-w-10 rounded-full border border-gold/35 px-2 text-[0.85rem] font-semibold text-sandal transition-colors hover:border-gold hover:text-ivory aria-pressed:border-marigold aria-pressed:text-marigold"
              aria-pressed={p.rate !== 1}
            >
              {p.rate}×
            </button>
            <IconToggle label="Play the next one automatically" pressed={autoNext} onClick={() => setAutoNext(!autoNext)}>
              <ListMusic className="size-[18px]" aria-hidden="true" />
            </IconToggle>
            <div className="relative" data-sleep>
              <IconToggle
                label={sleep ? "Sleep timer is on" : "Sleep timer"}
                pressed={sleep !== null}
                onClick={(e) => {
                  const el = e.currentTarget;
                  setSleepMenu((m) => (m ? null : el));
                }}
                expanded={sleepMenu !== null}
              >
                <Moon className="size-[18px]" aria-hidden="true" />
              </IconToggle>
              {sleepMenu && <SleepMenu anchor={sleepMenu} sleep={sleep} onPick={startSleep} />}
            </div>
            {/* phones: Share lives in the ⋯ menu so the controls stay on one row */}
            {!clip.owner && (
              <IconToggle label="Share this bhajan" onClick={share} className="max-sm:hidden">
                <Share2 className="size-[18px]" aria-hidden="true" />
              </IconToggle>
            )}
            <ClipMenu clip={clip} onShare={clip.owner ? undefined : share} className="size-11 max-[379px]:size-10 border border-gold/35 hover:border-gold" />
          </div>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-4 py-2.5 text-[0.95rem] text-ivory no-underline hover:border-gold lg:hidden"
          href={youtubeAtUrl(clip.videoId, clip.start)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Listen with the screen off: open in YouTube
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>

      {/* ---------- what is playing, and what follows ---------- */}
      <aside className={`flex min-w-0 flex-col gap-5 lg:max-h-[var(--fit-h)] ${showLyrics ? "lg:h-[var(--fit-h)]" : ""}`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h1 lang={langOf(clip.title)} className={`font-serif text-[clamp(1.75rem,1.3rem+1.4vw,2.4rem)] leading-[1.15] text-ivory [text-wrap:balance] ${showLyrics ? "lg:text-[clamp(1.5rem,0.9rem+1vw,2rem)]" : ""}`}>
              {clip.title}
            </h1>
            {!clip.owner && <HeartButton slug={clip.slug} title={clip.title} className="mt-1 size-11 shrink-0 border border-gold/35 hover:border-gold" />}
          </div>
          <p className="text-sandal">
            <span className="tabular whitespace-nowrap text-gold">{formatLength(length)}</span> ·{" "}
            <span className="whitespace-nowrap">
              {sectionsText(clip)} <span lang="hi">({sectionsHi(clip)})</span>
            </span>
          </p>
          {clip.owner && (
            <p>
              <Link href="/my" className="text-sandal underline decoration-gold/40 hover:text-ivory hover:decoration-gold">
                My videos
              </Link>
            </p>
          )}
          {clip.sample && (
            <p className="w-fit rounded-full border border-sandal/40 px-3 py-0.5 text-[0.85rem] text-sandal">
              Sample clip: times are placeholders
            </p>
          )}
          <a
            className="mt-1 inline-flex w-fit items-center gap-1.5 text-[0.95rem] text-sandal underline decoration-gold/40 hover:text-ivory hover:decoration-gold"
            href={youtubeAtUrl(clip.videoId, clip.start)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on YouTube
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        {(upNext.length > 0 || hasLyrics) && (
          <section
            className={`flex min-h-0 flex-col overflow-clip rounded-[4px] border-[6px] border-brass bg-shyam shadow-[0_18px_36px_-10px_rgb(0_0_0/0.55)] ${showLyrics && hasSynced ? "lg:min-h-[15rem] lg:flex-1" : ""}`}
            data-may-scroll
          >
            {hasLyrics ? (
              <div role="tablist" aria-label="Beside the player" className="flex gap-1 border-b border-gold/35 px-2 pt-2">
                {(
                  [
                    ["lyrics", "भजन के बोल", "Lyrics"],
                    ["next", "आगे के दर्शन", "Next"],
                  ] as const
                ).map(([id, hi, en]) => (
                  <button
                    key={id}
                    role="tab"
                    type="button"
                    id={`tab-${id}`}
                    aria-selected={tabNow === id}
                    aria-controls="side-panel"
                    onClick={() => setTabSel({ slug: clip.slug, tab: id })}
                    className="flex items-baseline gap-2 whitespace-nowrap rounded-t-[4px] px-3 pb-2 pt-1.5 text-mist aria-selected:bg-shyam-lit aria-selected:text-gold"
                  >
                    <span lang="hi" className="font-display text-[1.15rem] sm:text-[1.25rem]">
                      {hi}
                    </span>
                    <span className="hidden text-[0.8rem] sm:inline">{en}</span>
                  </button>
                ))}
              </div>
            ) : (
              <h2 className="flex items-baseline justify-between border-b border-gold/35 px-4 pb-2.5 pt-3">
                <span lang="hi" className="font-display text-[1.45rem] text-gold">
                  आगे के दर्शन
                </span>
                <span className="text-[0.85rem] text-mist">{queueLabel}</span>
              </h2>
            )}
            {showLyrics && hasSynced ? (
              <div id="side-panel" role="tabpanel" aria-labelledby="tab-lyrics" className="flex h-[24rem] min-h-0 flex-col lg:h-auto lg:flex-1">
                <SyncedLyrics
                  lines={synced!}
                  now={now}
                  live={mine && open}
                  onSeek={mine ? (t) => p.seekTo(t) : undefined}
                  lang={langOf(synced!.map((l) => l.text).join(" "))}
                />
              </div>
            ) : showLyrics ? (
              <div
                id="side-panel"
                role="tabpanel"
                aria-labelledby="tab-lyrics"
                tabIndex={0}
                lang={langOf(clip.lyrics)}
                className="max-h-[26rem] min-h-0 overflow-y-auto whitespace-pre-wrap px-5 py-4 font-serif text-[1.2rem] leading-[1.9] text-ivory lg:max-h-none"
              >
                {clip.lyrics}
              </div>
            ) : (
              <ol
                id="side-panel"
                role={hasLyrics ? "tabpanel" : undefined}
                aria-labelledby={hasLyrics ? "tab-next" : undefined}
                className="min-h-0 overflow-y-auto px-2 pb-6 pt-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]"
              >
                {upNext.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={clipHref(c)}
                      onClick={(e) => {
                        e.preventDefault();
                        playClip(c.slug);
                      }}
                      className="grid grid-cols-[22px_1fr_auto] items-center gap-3 rounded-[3px] px-2 py-2.5 no-underline transition-colors hover:bg-shyam-lit"
                    >
                      <Diya lit={played.has(c.slug)} className="size-[22px]" />
                      <span className="min-w-0">
                        <span lang={langOf(c.title)} className="block font-serif text-[1.05rem] leading-snug text-pretty text-ivory">
                          {c.title}
                        </span>
                        <span className="block text-[0.85rem] text-mist">{sectionsText(c)}</span>
                      </span>
                      <span className="tabular text-[0.85rem] text-mist">{formatLength(c.end - c.start)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
        {next && !autoNext && (
          <p className="text-[0.95rem] text-sandal">
            Next: <span className="text-ivory">{next.title}</span>. Turn on autoplay to follow on.
          </p>
        )}
        <p className={`hidden text-[0.9rem] text-sandal/80 lg:block ${showLyrics ? "short:hidden" : ""}`}>
          Keys: <kbd className="font-sans">Space</kbd> play/pause · <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> 5 seconds ·{" "}
          <kbd className="font-sans">N</kbd> next · <kbd className="font-sans">L</kbd> repeat
        </p>
        <p className={`text-[0.9rem] text-sandal/80 ${showLyrics ? "short:hidden" : ""}`}>
          Tip: to watch in 1080p, choose it once in YouTube&apos;s{" "}
          <Settings className="inline size-[1em] align-[-0.125em]" aria-label="settings" /> menu. YouTube remembers it on
          this device.
        </p>
      </aside>

    </div>
  );
}

function IconToggle({
  label,
  pressed,
  expanded,
  onClick,
  children,
  className = "",
}: {
  label: string;
  pressed?: boolean;
  expanded?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      aria-expanded={expanded}
      onClick={onClick}
      className={`grid size-11 place-items-center rounded-full border border-gold/35 text-sandal max-[379px]:size-10 transition-colors hover:border-gold hover:text-ivory aria-pressed:border-marigold aria-pressed:bg-marigold/15 aria-pressed:text-marigold ${className}`}
    >
      {children}
    </button>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 fill-marigold" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}

/** The sleep-timer menu, drawn on the page's top layer so the floating player never hides it. */
function SleepMenu({ anchor, sleep, onPick }: { anchor: HTMLElement; sleep: Sleep; onPick: (s: Sleep) => void }) {
  const r = anchor.getBoundingClientRect();
  return createPortal(
    <ul
      role="menu"
      aria-label="Sleep timer"
      data-sleep
      style={{ right: Math.max(8, window.innerWidth - r.right), bottom: window.innerHeight - r.top + 8 }}
      className="fixed z-[60] w-52 overflow-hidden rounded-[4px] border border-gold/60 bg-shyam py-1 shadow-[0_16px_32px_rgb(0_0_0/0.6)]"
    >
      {(
        [
          ["After this bhajan", { kind: "end" }],
          ["In 15 minutes", { kind: "time", minutes: 15 }],
          ["In 30 minutes", { kind: "time", minutes: 30 }],
          ["In 60 minutes", { kind: "time", minutes: 60 }],
        ] as const
      ).map(([label, s]) => (
        <li key={label} role="none">
          <button
            role="menuitem"
            type="button"
            onClick={() => onPick(s.kind === "end" ? { kind: "end" } : { kind: "time", minutes: s.minutes, until: Date.now() + s.minutes * 60_000 })}
            className="block w-full px-4 py-2.5 text-left text-ivory hover:bg-shyam-lit"
          >
            {label}
          </button>
        </li>
      ))}
      {sleep && (
        <li role="none" className="border-t border-gold/25">
          <button role="menuitem" type="button" onClick={() => onPick(null)} className="block w-full px-4 py-2.5 text-left text-marigold hover:bg-shyam-lit">
            Turn off
          </button>
        </li>
      )}
    </ul>,
    document.body,
  );
}
