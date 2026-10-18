"use client";

// The one YouTube player for the whole site. It lives in the root layout, so moving between pages
// never stops a bhajan: on its clip page the player sits exactly over the shrine's opening; anywhere
// else it shrinks to a mini player in the corner (full width on phones). The same element is only
// repositioned, never moved in the DOM, so YouTube's iframe is not reloaded.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, SkipForward, X } from "lucide-react";
import type { Clip } from "@/lib/clip-schema";
import { clipHref, langOf } from "@/lib/display";
import { markPlayed, usePref } from "@/lib/local";
import { formatTime, PLAYER_ERRORS } from "@/lib/youtube";
import { loadYouTubeApi, STATE, type YTPlayer } from "@/lib/yt-player";

export type Sleep = { kind: "end" } | { kind: "time"; until: number; minutes: number } | null;

type Player = {
  current: Clip | null;
  queue: Clip[];
  /** which clip page (component instance) the session belongs to */
  owner: string | null;
  /** the pat is open: the player is shown */
  open: boolean;
  playing: boolean;
  now: number;
  error: string | null;
  ended: boolean;
  sleep: Sleep;
  play(queue: Clip[], slug: string, owner: string): void;
  adopt(owner: string): void;
  toggle(): void;
  seekTo(t: number): void;
  seekBy(sec: number): void;
  next(): void;
  goTo(slug: string): void;
  restart(): void;
  close(): void;
  setSleep(s: Sleep): void;
  /** a clip page offers its shrine opening; the player sits over it while that page owns the session */
  registerSlot(el: HTMLElement, owner: string): () => void;
  flash(msg: string): void;
};

const Ctx = createContext<Player | null>(null);

export function usePlayer(): Player {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePlayer needs <PlayerProvider>");
  return p;
}

/** YouTube's player object exists before its methods do; only use it once they are attached. */
const ready = (p: YTPlayer | null): p is YTPlayer => p !== null && typeof p.getCurrentTime === "function";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Clip[]>([]);
  const [current, setCurrent] = useState<Clip | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [sleep, setSleepState] = useState<Sleep>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ el: HTMLElement; owner: string } | null>(null);
  const [loop] = usePref("loop", false);
  const [autoNext] = usePref("autonext", true);

  const dock = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const cur = useRef<Clip | null>(null);
  const q = useRef<Clip[]>([]);
  const endedFor = useRef<string | null>(null);
  const captionsOff = useRef(false);
  const prefs = useRef({ loop, autoNext });
  const sleepRef = useRef<Sleep>(null);
  const docked = useRef(false);
  const onEnd = useRef<() => void>(() => {});

  useEffect(() => {
    prefs.current = { loop, autoNext };
  }, [loop, autoNext]);
  useEffect(() => {
    sleepRef.current = sleep;
  }, [sleep]);

  const isDocked = Boolean(current && slot && slot.owner === owner);
  useEffect(() => {
    docked.current = isDocked;
  }, [isDocked]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const load = useCallback((c: Clip, play = true) => {
    endedFor.current = null;
    captionsOff.current = false;
    setNow(c.start);
    setError(null);
    setEnded(false);
    const p = player.current;
    if (!ready(p)) return; // still loading: it starts from the current clip once ready
    const o = { videoId: c.videoId, startSeconds: c.start, endSeconds: c.end };
    if (play) p.loadVideoById(o);
    else p.cueVideoById(o);
  }, []);

  const show = useCallback(
    (c: Clip) => {
      cur.current = c;
      setCurrent(c);
      // on the clip page, follow along in the address bar and tab title
      if (docked.current) {
        window.history.replaceState(null, "", clipHref(c));
        document.title = `${c.title} · Shravanam Kirtanam`;
      }
    },
    [],
  );

  const play = useCallback(
    (list: Clip[], slug: string, who: string) => {
      const c = list.find((x) => x.slug === slug) ?? list[0];
      if (!c) return;
      q.current = list;
      setQueue(list);
      setOwner(who);
      show(c);
      setOpen(true);
      load(c, true);
    },
    [load, show],
  );

  const goTo = useCallback(
    (slug: string) => {
      const c = q.current.find((x) => x.slug === slug);
      if (!c) return;
      show(c);
      setOpen(true);
      load(c, true);
    },
    [load, show],
  );

  const next = useCallback(() => {
    const list = q.current;
    const i = list.findIndex((x) => x.slug === cur.current?.slug);
    if (i >= 0 && i + 1 < list.length) goTo(list[i + 1].slug);
  }, [goTo]);

  const close = useCallback(() => {
    player.current?.destroy();
    player.current = null;
    host.current?.replaceChildren();
    cur.current = null;
    q.current = [];
    setCurrent(null);
    setQueue([]);
    setOwner(null);
    setOpen(false);
    setPlaying(false);
    setEnded(false);
    setError(null);
    setSleepState(null);
  }, []);

  // What happens when a clip reaches its end time.
  useEffect(() => {
    onEnd.current = () => {
      const c = cur.current;
      if (!c || endedFor.current === c.slug) return;
      endedFor.current = c.slug;
      if (sleepRef.current?.kind === "end") {
        setSleepState(null);
        setPlaying(false);
        setEnded(true);
        setOpen(false);
        flash("Sleep timer: stopped after this bhajan");
        return;
      }
      if (prefs.current.loop) return load(c, true);
      const list = q.current;
      const i = list.findIndex((x) => x.slug === c.slug);
      if (prefs.current.autoNext && i >= 0 && i + 1 < list.length) return goTo(list[i + 1].slug);
      setPlaying(false);
      setEnded(true);
      setOpen(false); // the pat closes: darshan is over
    };
  }, [flash, goTo, load]);

  // Create YouTube's player the first time something is played. It stays until close().
  useEffect(() => {
    if (!open || player.current || !host.current || !cur.current) return;
    let cancelled = false;
    const el = document.createElement("div");
    host.current.replaceChildren(el);
    const c = cur.current;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player.current = new YT.Player(el, {
          videoId: c.videoId,
          width: "100%",
          height: "100%",
          playerVars: { start: c.start, end: c.end, autoplay: 1, playsinline: 1, rel: 0, cc_load_policy: 0, origin: window.location.origin },
          events: {
            onReady: (e) => {
              // a different bhajan was picked while YouTube's player was still loading
              const n = cur.current;
              if (n && n.slug !== c.slug) e.target.loadVideoById({ videoId: n.videoId, startSeconds: n.start, endSeconds: n.end });
            },
            onStateChange: (e) => {
              const c2 = cur.current;
              if (!c2) return;
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
                setPlaying(true);
              } else {
                setPlaying(false);
              }
              if (e.data === STATE.ENDED) onEnd.current();
              if (e.data === STATE.PAUSED && e.target.getCurrentTime() >= c2.end - 0.75) onEnd.current();
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

  // Clip-relative progress, and the end-time check.
  useEffect(() => {
    if (!current) return;
    const t = window.setInterval(() => {
      const p = player.current;
      const c = cur.current;
      if (!ready(p) || !c) return;
      const s = p.getCurrentTime();
      setNow(s);
      if (s >= c.end - 0.25 && p.getPlayerState() !== STATE.PLAYING) onEnd.current();
    }, 250);
    return () => window.clearInterval(t);
  }, [current]);

  // Sleep timer by minutes: pause when it runs out.
  useEffect(() => {
    if (sleep?.kind !== "time") return;
    const t = window.setTimeout(() => {
      if (ready(player.current)) player.current.pauseVideo();
      setSleepState(null);
      flash("Sleep timer: paused");
    }, Math.max(0, sleep.until - Date.now()));
    return () => window.clearTimeout(t);
  }, [sleep, flash]);

  // Docked: keep the player exactly over the shrine's opening (it scrolls and resizes with the page).
  useLayoutEffect(() => {
    const d = dock.current;
    if (!d) return;
    if (!isDocked || !slot) {
      d.style.left = d.style.top = d.style.width = d.style.height = "";
      return;
    }
    let raf = 0;
    const place = () => {
      const r = slot.el.getBoundingClientRect();
      d.style.left = `${r.left}px`;
      d.style.top = `${r.top}px`;
      d.style.width = `${r.width}px`;
      d.style.height = `${r.height}px`;
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [isDocked, slot]);

  const api: Player = {
    current,
    queue,
    owner,
    open,
    playing,
    now,
    error,
    ended,
    sleep,
    play,
    adopt: (who) => setOwner(who),
    toggle: () => {
      const c = cur.current;
      if (!c) return;
      const p = player.current;
      if (!open) {
        setOpen(true);
        return load(c, true);
      }
      if (!ready(p)) return;
      const st = p.getPlayerState();
      if (st === STATE.PLAYING || st === STATE.BUFFERING) p.pauseVideo();
      else if (p.getCurrentTime() >= c.end - 0.75) load(c, true);
      else p.playVideo();
    },
    seekTo: (t) => {
      const p = player.current;
      const c = cur.current;
      if (!ready(p) || !c) return;
      const target = Math.min(Math.max(t, c.start), c.end - 1);
      p.seekTo(target, true);
      setNow(target);
    },
    seekBy: (sec) => {
      const p = player.current;
      const c = cur.current;
      if (!ready(p) || !c || !open) return;
      const target = Math.min(Math.max(p.getCurrentTime() + sec, c.start), c.end - 1);
      p.seekTo(target, true);
      setNow(target);
    },
    next,
    goTo,
    restart: () => {
      if (!cur.current) return;
      setOpen(true);
      load(cur.current, true);
    },
    close,
    setSleep: (s) => setSleepState(s),
    registerSlot: (el, who) => {
      setSlot({ el, owner: who });
      return () => setSlot((s) => (s?.el === el ? null : s));
    },
    flash,
  };

  const mini = Boolean(current) && !isDocked;
  // Docked: shown while the pat is open (fading in as it parts) and hidden behind an error message.
  const visible = mini || (isDocked && open && !error);
  const length = current ? current.end - current.start : 1;
  const elapsed = current ? Math.min(Math.max(now - current.start, 0), length) : 0;
  const i = current ? queue.findIndex((x) => x.slug === current.slug) : -1;
  const hasNext = i >= 0 && i + 1 < queue.length;

  return (
    <Ctx.Provider value={api}>
      {children}

      <div
        ref={dock}
        aria-hidden={!current || (!mini && !visible) ? true : undefined}
        className={[
          "fixed z-40",
          !current ? "pointer-events-none invisible left-0 top-0 size-px opacity-0" : "",
          isDocked ? `transition-opacity ${visible ? "opacity-100 delay-500 duration-700" : "pointer-events-none invisible opacity-0 duration-200"}` : "",
          mini
            ? "inset-x-2 bottom-2 overflow-hidden rounded-[6px] border-2 border-brass bg-shyam shadow-[0_18px_40px_-8px_rgb(0_0_0/0.75)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[22.5rem]"
            : "",
        ].join(" ")}
      >
        <div className={mini ? "relative h-[200px] w-full bg-black" : "relative size-full"}>
          <div ref={host} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
        </div>

        {mini && current && (
          <div className="relative flex items-center gap-2 px-3 py-2" data-mini>
            {/* progress through the clip */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gold/20" aria-hidden="true">
              <div className="h-full bg-marigold" style={{ width: `${(elapsed / length) * 100}%` }} />
            </div>
            <Link href={clipHref(current)} className="min-w-0 flex-1 no-underline" title="Back to this bhajan's page" data-mini-title>
              <span lang={langOf(current.title)} className="block truncate font-serif text-[1.02rem] leading-snug text-ivory hover:text-marigold">
                {current.title}
              </span>
              <span className="tabular block text-[0.8rem] text-mist">
                {error ? "Couldn't play" : ended ? "Darshan over" : `${formatTime(elapsed)} / ${formatTime(length)}`}
              </span>
            </Link>
            <button
              type="button"
              onClick={api.toggle}
              aria-label={playing ? "Pause" : "Play"}
              title={playing ? "Pause" : "Play"}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-marigold text-velvet-deep hover:bg-[#ffb32e]"
            >
              {playing ? <Pause className="size-4 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />}
            </button>
            {hasNext && (
              <button
                type="button"
                onClick={next}
                aria-label="Next bhajan"
                title="Next bhajan"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/40 text-sandal hover:border-gold hover:text-ivory"
              >
                <SkipForward className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close the player"
              title="Close"
              className="grid size-10 shrink-0 place-items-center rounded-full text-sandal hover:bg-shyam-lit hover:text-ivory"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* phones: room at the end of the page so nothing stays hidden under the mini player */}
      {mini && <div className="h-[17rem] shrink-0 sm:h-0" aria-hidden="true" />}
      <p className="sr-only" aria-live="polite">
        {current && open ? `Now playing: ${current.title}` : ""}
      </p>
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-gold/60 bg-shyam px-5 py-2.5 text-ivory shadow-[0_10px_30px_rgb(0_0_0/0.5)] ${mini ? "bottom-[17.5rem] sm:bottom-6" : "bottom-6"}`}
        >
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}
