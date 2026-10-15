"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, ListMusic, Moon, Pause, Play, Repeat, RotateCcw, Settings, Share2 } from "lucide-react";
import type { Clip } from "@/lib/clip-schema";
import { CATEGORY_LABELS } from "@/lib/clip-schema";
import { langOf, libraryHref, sourceLabel } from "@/lib/display";
import { markPlayed, requestAutoplay, takeAutoplay, usePlayed, usePref } from "@/lib/local";
import { formatLength, formatTime, PLAYER_ERRORS, thumbnailUrl, youtubeAtUrl } from "@/lib/youtube";
import { loadYouTubeApi, STATE, type YTPlayer } from "@/lib/yt-player";
import { HeartButton } from "./HeartButton";
import { Diya } from "./ornaments";
import { Shrine, shrineMaxWidth } from "./Shrine";

type Props = { queue: Clip[]; initialSlug: string; queueLabel: string };
/** YouTube's player object exists before its methods do; only use it once they are attached. */
const ready = (p: YTPlayer | null): p is YTPlayer => p !== null && typeof p.getCurrentTime === "function";

type Sleep = { kind: "end" } | { kind: "time"; until: number; minutes: number } | null;
type Tab = "next" | "lyrics";

export function ClipStage({ queue, initialSlug, queueLabel }: Props) {
  const [idx, setIdx] = useState(() => Math.max(0, queue.findIndex((c) => c.slug === initialSlug)));
  const clip = queue[idx];
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(clip.start);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sleep, setSleep] = useState<Sleep>(null);
  const [sleepMenu, setSleepMenu] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  const [loop, setLoop] = usePref("loop", false);
  const [autoNext, setAutoNext] = usePref("autonext", true);
  const played = usePlayed();

  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const current = useRef(clip);
  const endedFor = useRef<string | null>(null);
  const captionsOff = useRef(false);
  const prefs = useRef({ loop, autoNext });
  const onEndRef = useRef<() => void>(() => {});
  const sleepRef = useRef<Sleep>(null);
  const actions = useRef({ togglePlay: () => {}, seekBy: (_: number) => {}, nextClip: () => {}, toggleLoop: () => {} });

  useEffect(() => {
    current.current = clip;
  }, [clip]);
  useEffect(() => {
    prefs.current = { loop, autoNext };
  }, [loop, autoNext]);
  useEffect(() => {
    sleepRef.current = sleep;
  }, [sleep]);

  const next = idx + 1 < queue.length ? queue[idx + 1] : null;
  // What follows this clip in its section, wrapping round to the start.
  const upNext = [...queue.slice(idx + 1), ...queue.slice(0, idx)].map((c) => ({ c, i: queue.indexOf(c) }));
  const length = clip.end - clip.start;
  const elapsed = Math.min(Math.max(now - clip.start, 0), length);

  const load = useCallback((c: Clip, play: boolean) => {
    endedFor.current = null;
    captionsOff.current = false;
    setNow(c.start);
    setError(null);
    setEnded(false);
    const p = player.current;
    if (!ready(p)) return; // not loaded yet: it will start from the current clip when it is
    const o = { videoId: c.videoId, startSeconds: c.start, endSeconds: c.end };
    if (play) p.loadVideoById(o);
    else p.cueVideoById(o);
  }, []);

  const goTo = useCallback(
    (i: number, play: boolean) => {
      const c = queue[i];
      if (!c) return;
      setIdx(i);
      setTab(null);
      current.current = c;
      window.history.replaceState(null, "", `/clip/${c.slug}`);
      document.title = `${c.title} · Shravanam Kirtanam`;
      if (player.current) {
        load(c, play);
        if (play) setOpen(true);
      } else if (play) {
        setOpen(true);
      }
    },
    [queue, load],
  );

  // What happens when a clip reaches its end time.
  useEffect(() => {
    onEndRef.current = () => {
      const c = current.current;
      if (endedFor.current === c.slug) return;
      endedFor.current = c.slug;
      if (sleepRef.current?.kind === "end") {
        // "stop after this bhajan": no repeat, no next
        setSleep(null);
        setPlaying(false);
        setEnded(true);
        setOpen(false);
        flash("Sleep timer: stopped after this bhajan");
        return;
      }
      if (prefs.current.loop) {
        load(c, true);
        return;
      }
      const i = queue.findIndex((q) => q.slug === c.slug);
      if (prefs.current.autoNext && i + 1 < queue.length) {
        goTo(i + 1, true);
        return;
      }
      setPlaying(false);
      setEnded(true);
      setOpen(false); // the pat closes: darshan is over
    };
  }, [queue, goTo, load]);

  // Create YouTube's player the first time the pat opens; destroy it on leave.
  useEffect(() => {
    if (!open || player.current || !host.current) return;
    let cancelled = false;
    const el = document.createElement("div");
    host.current.appendChild(el);
    const c = current.current;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player.current = new YT.Player(el, {
          videoId: c.videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start: c.start,
            end: c.end,
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            cc_load_policy: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              // a different bhajan was picked while YouTube's player was still loading
              const now = current.current;
              if (now.slug !== c.slug) e.target.loadVideoById({ videoId: now.videoId, startSeconds: now.start, endSeconds: now.end });
            },
            onStateChange: (e) => {
              const c2 = current.current;
              if (e.data === STATE.PLAYING) {
                setPlaying(true);
                markPlayed(c2.slug);
                if (!captionsOff.current) {
                  captionsOff.current = true;
                  try {
                    e.target.unloadModule?.("captions"); // Hindi auto-captions start on in embeds
                  } catch {}
                }
              } else if (e.data === STATE.BUFFERING) {
                setPlaying(true); // loading more of a clip that is playing
              } else {
                setPlaying(false);
              }
              if (e.data === STATE.ENDED) onEndRef.current();
              if (e.data === STATE.PAUSED && e.target.getCurrentTime() >= c2.end - 0.75) onEndRef.current();
            },
            onError: (e) => setError(PLAYER_ERRORS[e.data] ?? `YouTube couldn't play this video (error ${e.data}).`),
          },
        });
      })
      .catch((err: Error) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(
    () => () => {
      player.current?.destroy();
      player.current = null;
    },
    [],
  );

  // Clip-relative progress.
  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => {
      const p = player.current;
      if (!p || typeof p.getCurrentTime !== "function") return;
      const s = p.getCurrentTime();
      setNow(s);
      if (s >= current.current.end - 0.25 && p.getPlayerState() !== STATE.PLAYING) onEndRef.current();
    }, 250);
    return () => window.clearInterval(t);
  }, [open]);

  // A tap on this site's board opens the pat straight away.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after hydration
    if (takeAutoplay(initialSlug)) setOpen(true);
  }, [initialSlug]);

  // Sleep timer by minutes: pause when it runs out.
  useEffect(() => {
    if (sleep?.kind !== "time") return;
    const t = window.setTimeout(() => {
      if (ready(player.current)) player.current.pauseVideo();
      setSleep(null);
      flash("Sleep timer: paused");
    }, Math.max(0, sleep.until - Date.now()));
    return () => window.clearTimeout(t);
  }, [sleep]);

  // Close the sleep menu on Escape or a tap elsewhere.
  useEffect(() => {
    if (!sleepMenu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as HTMLElement).closest("[data-sleep]")) setSleepMenu(false);
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
      const onControl = t.closest("button,a,[role=slider],[role=tab]");
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

  function seekBy(sec: number) {
    const p = player.current;
    if (!ready(p) || !open) return;
    const c = current.current;
    const target = Math.min(Math.max(p.getCurrentTime() + sec, c.start), c.end - 1);
    p.seekTo(target, true);
    setNow(target);
  }

  function nextClip() {
    const i = queue.findIndex((q) => q.slug === current.current.slug);
    if (i + 1 < queue.length) goTo(i + 1, true);
  }

  function startSleep(s: Sleep) {
    setSleep(s);
    setSleepMenu(false);
    flash(s === null ? "Sleep timer off" : s.kind === "end" ? "Will stop after this bhajan" : `Will pause in ${s.minutes} minutes`);
  }

  function togglePlay() {
    const p = player.current;
    if (!open) return openDarshan();
    if (!ready(p)) return;
    const st = p.getPlayerState();
    if (st === STATE.PLAYING || st === STATE.BUFFERING) p.pauseVideo();
    else if (p.getCurrentTime() >= current.current.end - 0.75) load(current.current, true);
    else p.playVideo();
  }

  function openDarshan() {
    if (ready(player.current)) load(current.current, true);
    setOpen(true);
  }

  function seek(e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) {
    const p = player.current;
    if (!ready(p)) return;
    let target: number;
    if ("clientX" in e) {
      const r = e.currentTarget.getBoundingClientRect();
      target = clip.start + ((e.clientX - r.left) / r.width) * length;
    } else {
      const step = e.key === "ArrowRight" ? 5 : e.key === "ArrowLeft" ? -5 : 0;
      if (!step) return;
      e.preventDefault();
      target = now + step;
    }
    target = Math.min(Math.max(target, clip.start), clip.end - 1);
    p.seekTo(target, true);
    setNow(target);
  }

  async function share() {
    const url = `${window.location.origin}/clip/${clip.slug}`;
    const data = { title: clip.title, text: `${clip.title} · Shravanam Kirtanam`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch (err) {
      if ((err as Error).name !== "AbortError") flash("Couldn't share. Copy the address bar instead.");
    }
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    actions.current = { togglePlay, seekBy, nextClip, toggleLoop: () => setLoop(!prefs.current.loop) };
  });

  const cat = CATEGORY_LABELS[clip.category];
  const tabNow: Tab = tab ?? (clip.lyrics ? "lyrics" : "next");
  const showLyrics = Boolean(clip.lyrics) && tabNow === "lyrics";

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
                <div ref={host} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
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
          <div
            role="slider"
            tabIndex={0}
            aria-label="Position in this clip"
            aria-valuemin={0}
            aria-valuemax={length}
            aria-valuenow={Math.round(elapsed)}
            aria-valuetext={`${formatTime(elapsed)} of ${formatTime(length)}`}
            onClick={seek}
            onKeyDown={seek}
            className="group relative h-6 min-w-[160px] flex-1 cursor-pointer"
          >
            <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-gold/20" />
            <div
              className="absolute left-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--color-marigold-deep),var(--color-marigold))]"
              style={{ width: `${(elapsed / length) * 100}%` }}
            />
            <div
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-marigold shadow-[0_1px_4px_rgb(0_0_0/0.5)] transition-transform group-hover:scale-125"
              style={{ left: `${(elapsed / length) * 100}%` }}
            />
          </div>
          <span className="tabular min-w-[5.5rem] text-right text-[0.95rem] text-sandal">
            {formatTime(elapsed)} / {formatTime(length)}
          </span>
          <div className="flex items-center gap-1.5">
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
            <IconToggle label="Play from the start" onClick={() => (open ? load(clip, true) : openDarshan())}>
              <RotateCcw className="size-[18px]" aria-hidden="true" />
            </IconToggle>
            <IconToggle label="Repeat this bhajan" pressed={loop} onClick={() => setLoop(!loop)}>
              <Repeat className="size-[18px]" aria-hidden="true" />
            </IconToggle>
            <IconToggle label="Play the next one automatically" pressed={autoNext} onClick={() => setAutoNext(!autoNext)}>
              <ListMusic className="size-[18px]" aria-hidden="true" />
            </IconToggle>
            <div className="relative" data-sleep>
              <IconToggle
                label={sleep ? "Sleep timer is on" : "Sleep timer"}
                pressed={sleep !== null}
                onClick={() => setSleepMenu((v) => !v)}
                expanded={sleepMenu}
              >
                <Moon className="size-[18px]" aria-hidden="true" />
              </IconToggle>
              {sleepMenu && (
                <ul
                  role="menu"
                  aria-label="Sleep timer"
                  className="absolute bottom-full right-0 z-30 mb-2 w-52 overflow-hidden rounded-[4px] border border-gold/60 bg-shyam py-1 shadow-[0_16px_32px_rgb(0_0_0/0.6)]"
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
                        onClick={() => startSleep(s.kind === "end" ? { kind: "end" } : { kind: "time", minutes: s.minutes, until: Date.now() + s.minutes * 60_000 })}
                        className="block w-full px-4 py-2.5 text-left text-ivory hover:bg-shyam-lit"
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                  {sleep && (
                    <li role="none" className="border-t border-gold/25">
                      <button role="menuitem" type="button" onClick={() => startSleep(null)} className="block w-full px-4 py-2.5 text-left text-marigold hover:bg-shyam-lit">
                        Turn off
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <IconToggle label="Share this bhajan" onClick={share}>
              <Share2 className="size-[18px]" aria-hidden="true" />
            </IconToggle>
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
        <p className="sr-only" aria-live="polite">
          {open ? `Now playing: ${clip.title}` : ""}
        </p>
      </div>

      {/* ---------- what is playing, and what follows ---------- */}
      <aside className="flex min-w-0 flex-col gap-5 lg:max-h-[var(--fit-h)]">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h1 lang={langOf(clip.title)} className="font-serif text-[clamp(1.75rem,1.3rem+1.4vw,2.4rem)] leading-[1.15] text-ivory [text-wrap:balance]">
              {clip.title}
            </h1>
            <HeartButton slug={clip.slug} title={clip.title} className="mt-1 size-11 shrink-0 border border-gold/35 hover:border-gold" />
          </div>
          <p className="text-sandal">
            <span className="tabular whitespace-nowrap text-gold">
              {formatTime(clip.start)} – {formatTime(clip.end)}
            </span>{" "}
            · <span className="whitespace-nowrap">{formatLength(length)}</span> ·{" "}
            <span className="whitespace-nowrap">
              {cat.en} <span lang="hi">({cat.hi})</span>
            </span>
          </p>
          <p>
            <Link
              href={libraryHref(clip, clip.videoId)}
              className="text-sandal underline decoration-gold/40 hover:text-ivory hover:decoration-gold"
            >
              {sourceLabel(clip)}
            </Link>
          </p>
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
            Open on YouTube at {formatTime(clip.start)}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        {(upNext.length > 0 || clip.lyrics) && (
          <section
            className="flex min-h-0 flex-col overflow-hidden rounded-[4px] border-[6px] border-brass bg-shyam shadow-[0_18px_36px_-10px_rgb(0_0_0/0.55)]"
            data-may-scroll
          >
            {clip.lyrics ? (
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
                    onClick={() => setTab(id)}
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
            {showLyrics ? (
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
                role={clip.lyrics ? "tabpanel" : undefined}
                aria-labelledby={clip.lyrics ? "tab-next" : undefined}
                className="min-h-0 overflow-y-auto px-2 pb-6 pt-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]"
              >
                {upNext.map(({ c, i }) => (
                  <li key={c.slug}>
                    <Link
                      href={`/clip/${c.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        requestAutoplay(c.slug);
                        goTo(i, true);
                      }}
                      className="grid grid-cols-[22px_1fr_auto] items-center gap-3 rounded-[3px] px-2 py-2.5 no-underline transition-colors hover:bg-shyam-lit"
                    >
                      <Diya lit={played.has(c.slug)} className="size-[22px]" />
                      <span className="min-w-0">
                        <span lang={langOf(c.title)} className="block font-serif text-[1.05rem] leading-snug text-pretty text-ivory">
                          {c.title}
                        </span>
                        <span className="tabular block text-[0.85rem] text-mist">
                          {formatTime(c.start)} – {formatTime(c.end)} · <span className="whitespace-nowrap">{sourceLabel(c)}</span>
                        </span>
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
        <p className="hidden text-[0.9rem] text-sandal/80 lg:block">
          Keys: <kbd className="font-sans">Space</kbd> play/pause · <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> 5 seconds ·{" "}
          <kbd className="font-sans">N</kbd> next · <kbd className="font-sans">L</kbd> repeat
        </p>
        <p className="text-[0.9rem] text-sandal/80">
          Tip: to watch in 1080p, choose it once in YouTube&apos;s{" "}
          <Settings className="inline size-[1em] align-[-0.125em]" aria-label="settings" /> menu. YouTube remembers it on
          this device.
        </p>
      </aside>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-gold/60 bg-shyam px-5 py-2.5 text-ivory shadow-[0_10px_30px_rgb(0_0_0/0.5)]">
          {toast}
        </div>
      )}
    </div>
  );
}

function IconToggle({
  label,
  pressed,
  expanded,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  expanded?: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
      className="grid size-11 place-items-center rounded-full border border-gold/35 text-sandal transition-colors hover:border-gold hover:text-ivory aria-pressed:border-marigold aria-pressed:bg-marigold/15 aria-pressed:text-marigold"
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
