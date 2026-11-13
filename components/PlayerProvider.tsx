"use client";

// The one YouTube player for the whole site. It lives in the root layout, so moving between pages
// never stops a bhajan: on its clip page the player sits exactly over the shrine's opening; anywhere
// else it shrinks to a mini player in the corner (full width on phones). The same element is only
// repositioned, never moved in the DOM, so YouTube's iframe is not reloaded.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Pause, Play, SkipForward, X } from "lucide-react";
import type { Clip } from "@/lib/clip-schema";
import { clipHref, langOf } from "@/lib/display";
import { ensureAccount, getAccount } from "@/lib/account-client";
import { askToSignIn } from "@/lib/signin-gate";
import { clearResume, clearResumeAt, markPlayed, peekResumeAt, saveResume, usePref, useRepeat, useSpeed } from "@/lib/local";
import { afterEnd, appendToQueue, insertNext, type Repeat } from "@/lib/player-rules";
import { Scrubber } from "./Scrubber";
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
  repeat: Repeat;
  /** one of YouTube's speeds, 0.25× to 2× */
  rate: number;
  cycleRepeat(): void;
  cycleRate(): void;
  /** set a speed directly (the ⋯ menu's list); 1 for normal */
  setRate(rate: number): void;
  /** play this one right after the current bhajan (or start it, if nothing is playing) */
  playNext(clip: Clip): void;
  /** put this one at the end of the queue (or start it, if nothing is playing) */
  addToQueue(clip: Clip): void;
  play(queue: Clip[], slug: string, owner: string): void;
  adopt(owner: string): void;
  toggle(): void;
  seekTo(t: number): void;
  seekBy(sec: number): void;
  /** the next bhajan in the queue, going round at the end */
  next(): void;
  /** the one before it, going round at the start */
  previous(): void;
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
  // Where the player's box lives in the page: inside #content, the element the page scrolls, so it is
  // clipped and carried by the page exactly like the shrine it sits in.
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [repeat, cycleRepeat] = useRepeat();
  const [rate, setSpeed] = useSpeed();
  const [autoNext] = usePref("autonext", true);

  const dock = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const cur = useRef<Clip | null>(null);
  const q = useRef<Clip[]>([]);
  const endedFor = useRef<string | null>(null);
  const captionsOff = useRef(false);
  const prefs = useRef({ repeat, autoNext });
  const rateRef = useRef(rate);
  const sleepRef = useRef<Sleep>(null);
  const onEnd = useRef<() => void>(() => {});
  const lastSave = useRef(0);
  /** Which timing request is the current one; an older answer is dropped. */
  const seq = useRef(0);

  useEffect(() => {
    prefs.current = { repeat, autoNext };
  }, [repeat, autoNext]);
  useEffect(() => {
    rateRef.current = rate;
    if (ready(player.current)) player.current.setPlaybackRate?.(rate);
  }, [rate]);
  useEffect(() => {
    sleepRef.current = sleep;
  }, [sleep]);

  const isDocked = Boolean(current && slot && slot.owner === owner);

  // While the player sits in this page's shrine, the address bar and the tab follow the bhajan that
  // is actually playing — including one started by the next/previous buttons.
  useEffect(() => {
    if (!isDocked || !current) return;
    window.history.replaceState(null, "", clipHref(current));
    document.title = `${current.title} · Shravanam Kirtanam`;
  }, [isDocked, current]);

  const mini = Boolean(current) && !isDocked;
  // Docked: shown while the pat is open (fading in as it parts) and hidden behind an error message.
  const visible = mini || (isDocked && open && !error);

  // The dock sits above the parting curtain, so it fades in a beat late (opacity 0 → 1 over ~1.2s).
  // The player must not be created during that: an iframe born inside a transparent, animating box is
  // never painted by an Android WebView — it stays a black rectangle until something resizes it. That
  // is exactly why opening the mini player (fixed in the viewport, fully opaque) made the picture
  // appear, and why it stayed after going back: a resize painted it. So wait until the dock is really
  // on screen and opaque, then create the player.
  const [fadeDone, setFadeDone] = useState(false);
  // The mini player is fixed in the viewport and opaque from its first frame — nothing to wait for.
  const drawn = mini || fadeDone;
  useEffect(() => {
    if (!visible || mini || fadeDone) return;
    // Fetch YouTube's API while the curtain is opening, so that creating the player once the fade is
    // over is immediate rather than another second of black screen.
    void loadYouTubeApi().catch(() => {});
    const t = window.setTimeout(() => setFadeDone(true), 1250); // 500ms delay + 700ms fade
    return () => window.clearTimeout(t);
  }, [visible, mini, fadeDone]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  // Listening needs an account, so every start asks first. A signed-out tap opens the sign-in prompt
  // and the same tap is finished after signing in — the shrine's buttons stay visible throughout.
  const allow = useCallback((what: string, run: () => void) => {
    if (getAccount().status === "in") return run();
    void ensureAccount().then((acct) => (acct.status === "in" ? run() : askToSignIn(what, run)));
  }, []);

  const load = useCallback((c: Clip, play = true) => {
    endedFor.current = null;
    captionsOff.current = false;
    const saved = peekResumeAt(c.slug); // a "Continue" tap starts partway in
    const from = saved !== null && saved >= c.start + 10 && saved <= c.end - 10 ? saved : c.start;
    setNow(from);
    setError(null);
    setEnded(false);
    const p = player.current;
    if (!ready(p)) return; // still loading: it starts from the current clip once ready
    const o = { videoId: c.videoId, startSeconds: from, endSeconds: c.end };
    if (play) p.loadVideoById(o);
    else p.cueVideoById(o);
  }, []);

  // Public clips carry no real times. Ask for just this clip's start/end when it is about to play:
  // that keeps the whole curation out of every page, and makes a bulk copy many slow, logged calls.
  const fetchTiming = useCallback(
    async (c: Clip): Promise<Clip | null> => {
      if (c.owner || c.rank === undefined) return c; // a private video, or already timed
      try {
        const res = await fetch(`/api/play/${encodeURIComponent(c.slug)}`, { method: "POST", cache: "no-store" });
        if (res.status === 429) {
          flash("Too many bhajans started at once. Please wait a moment.");
          return null;
        }
        if (!res.ok) {
          flash(res.status === 401 ? "Please sign in to listen." : "Couldn't start this bhajan. Please try again.");
          return null;
        }
        const d = (await res.json()) as { start?: unknown; end?: unknown };
        if (typeof d.start !== "number" || typeof d.end !== "number" || d.end <= d.start) {
          flash("Couldn't start this bhajan. Please try again.");
          return null;
        }
        return { ...c, start: d.start, end: d.end };
      } catch {
        flash("Couldn't reach the site. Please try again.");
        return null;
      }
    },
    [flash],
  );

  const show = useCallback((c: Clip) => {
    cur.current = c;
    setCurrent(c);
  }, []);

  /** Fetch this clip's times, then make it the current one. Returns false if another start took over. */
  const start = useCallback(
    (c: Clip, list?: Clip[], who?: string): Promise<boolean> => {
      const n = ++seq.current;
      return fetchTiming(c).then((timed) => {
        if (!timed || n !== seq.current) return false;
        if (list) {
          q.current = list;
          setQueue(list);
        }
        if (who !== undefined) setOwner(who);
        show(timed);
        setOpen(true);
        load(timed, true);
        return true;
      });
    },
    [fetchTiming, load, show],
  );

  const play = useCallback(
    (list: Clip[], slug: string, who: string) => {
      const c = list.find((x) => x.slug === slug) ?? list[0];
      if (!c) return;
      allow("listen to this bhajan", () => {
        void start(c, list, who);
      });
    },
    [allow, start],
  );

  const goTo = useCallback(
    (slug: string) => {
      const c = q.current.find((x) => x.slug === slug);
      if (!c) return;
      allow("listen to this bhajan", () => {
        void start(c);
      });
    },
    [allow, start],
  );

  // Next and previous walk the queue, and go round it — the same circle the "what follows" list on
  // the page already shows, so neither button ever turns into a dead end.
  const step = useCallback(
    (dir: 1 | -1) => {
      const list = q.current;
      const i = list.findIndex((x) => x.slug === cur.current?.slug);
      if (i < 0) return;
      goTo(list[(i + dir + list.length) % list.length].slug);
    },
    [goTo],
  );
  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const edit = useCallback(
    (clip: Clip, how: "next" | "end") => {
      const cs = cur.current?.slug;
      if (!cs) {
        // nothing playing: it simply starts, in the mini player
        allow("listen to this bhajan", () => {
          void start(clip, [clip], "__queue").then((ok) => {
            if (ok) flash("Playing now");
          });
        });
        return;
      }
      const list = how === "next" ? insertNext(q.current, cs, clip) : appendToQueue(q.current, cs, clip);
      q.current = list;
      setQueue(list);
      flash(how === "next" ? "Will play next" : "Added to the queue");
    },
    [allow, flash, start],
  );
  const playNext = useCallback((clip: Clip) => edit(clip, "next"), [edit]);
  const addToQueue = useCallback((clip: Clip) => edit(clip, "end"), [edit]);

  const close = useCallback(() => {
    seq.current++; // a timing request still in flight must not reopen the player
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
    setFadeDone(false); // the next darshan creates its player once its box is really on screen
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
      const step = afterEnd({ repeat: prefs.current.repeat, autoNext: prefs.current.autoNext, list: q.current, slug: c.slug });
      if (step.action === "replay") return load(c, true);
      if (step.action === "goto") return goTo(step.slug);
      setPlaying(false);
      setEnded(true);
      setOpen(false); // the pat closes: darshan is over
    };
  }, [flash, goTo, load]);

  // Create YouTube's player once the dock is drawn. It stays until close().
  useEffect(() => {
    if (!open || !drawn || player.current || !host.current || !cur.current) return;
    let cancelled = false;
    const box = host.current;
    // YouTube measures its own iframe once, when it is created, and never looks again: a player born
    // in a box that has no size stays a black rectangle with sound. This box only gets its size once
    // the shrine's opening has been measured, which is a moment after playback is asked for — so wait
    // for that, and after that keep telling the player its size (`setSize` is also what makes it
    // re-lay-out its picture when the box changes).
    const size = () => {
      const r = box.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2 ? r : null;
    };
    const fit = () => {
      const p = player.current;
      const r = size();
      if (!p || !r || typeof p.setSize !== "function") return;
      p.setSize(Math.round(r.width), Math.round(r.height));
    };
    // Make the player lay its picture out again. A WebView can leave the video surface unpainted from
    // the moment it was created; nudging the iframe by a pixel and putting it back is the same thing
    // that happens when the player is minimised and reopened — the recovery you found by hand.
    const kick = () => {
      const p = player.current;
      const r = size();
      if (!p || !r || typeof p.setSize !== "function") return;
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      p.setSize(w + 1, h);
      requestAnimationFrame(() => {
        if (player.current === p) p.setSize?.(w, h);
      });
    };
    let started = false;
    let shownPlaying = false;
    const start = (force = false) => {
      if (started || cancelled || player.current) return;
      const r = size();
      if (!r && !force) return;
      started = true;
      const c = cur.current;
      if (!c) return;
      const el = document.createElement("div");
      box.replaceChildren(el);
      loadYouTubeApi()
        .then((YT) => {
          if (cancelled) return;
          player.current = new YT.Player(el, {
            videoId: c.videoId,
            width: String(Math.round(r?.width ?? 640)),
            height: String(Math.round(r?.height ?? 360)),
            playerVars: { start: peekResumeAt(c.slug) ?? c.start, end: c.end, autoplay: 1, playsinline: 1, rel: 0, cc_load_policy: 0, origin: window.location.origin },
            events: {
              onReady: (e) => {
                kick();
                // a different bhajan was picked while YouTube's player was still loading
                const n = cur.current;
                if (n && n.slug !== c.slug) e.target.loadVideoById({ videoId: n.videoId, startSeconds: peekResumeAt(n.slug) ?? n.start, endSeconds: n.end });
              },
              onStateChange: (e) => {
                const c2 = cur.current;
                if (!c2) return;
                if (e.data === STATE.PLAYING) {
                  setPlaying(true);
                  // First picture: hand the surface one more layout, in case the create-time nudge
                  // landed while YouTube had nothing to draw yet.
                  if (!shownPlaying) {
                    shownPlaying = true;
                    kick();
                  }
                  clearResumeAt(); // the "Continue" jump has happened
                  if (rateRef.current !== 1) e.target.setPlaybackRate?.(rateRef.current);
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
    };

    // The box is placed a moment after playback is asked for: create the player on that first real
    // size, then keep it matched to the box.
    const watch = new ResizeObserver(() => (started ? fit() : start()));
    watch.observe(box);
    start();
    // Nothing gave the box a size: better a player with the wrong size (it can still be corrected)
    // than a bhajan that never starts.
    const fallback = window.setTimeout(() => start(true), 1500);
    // A second nudge once the stream is actually loaded (YouTube reports ready before it has a
    // picture to show), so a surface that failed to attach at creation gets laid out again.
    const again = window.setTimeout(kick, 2600);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      window.clearTimeout(again);
      watch.disconnect();
    };
    // `mount` is the box the player is drawn in; `drawn` is the dock really being on screen.
  }, [open, drawn, mount]);

  // Clip-relative progress, and the end-time check.
  useEffect(() => {
    if (!current) return;
    const t = window.setInterval(() => {
      const p = player.current;
      const c = cur.current;
      if (!ready(p) || !c) return;
      const s = p.getCurrentTime();
      setNow(s);
      // remember where we are (every ~5 seconds) so the home page can offer "Continue"
      if (p.getPlayerState() === STATE.PLAYING && Date.now() - lastSave.current > 5000) {
        lastSave.current = Date.now();
        if (s >= c.end - 10) clearResume(c.slug);
        else if (s > c.start + 5) saveResume(c.slug, s);
      }
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

  // The player is drawn inside #content — the box the page scrolls — rather than at the end of <body>.
  // Otherwise its box sits in the document where nothing clips it, and on a wide screen, where only
  // #content scrolls, it slides up over the header while the shrine is cut off underneath it.
  // One-shot discovery of a node the root layout renders; nothing cascades from it.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMount(document.getElementById("player-mount") ?? document.body);
  }, []);

  // Docked: put the player exactly over the shrine's opening.
  //
  // The player is a child of the page's own scroll area, so the scroll carries and clips it exactly
  // like the shrine — nothing has to follow the scroll, and a stalled frame cannot leave it behind
  // or let it paint outside the frame. All this has to do is follow the slot when the *layout*
  // moves (window size, zoom, a reflow).
  useLayoutEffect(() => {
    const d = dock.current;
    if (!d) return;
    if (!isDocked || !slot) {
      d.style.left = d.style.top = d.style.width = d.style.height = "";
      return;
    }

    const place = () => {
      // Offsets relative to the box that holds the player (inside the page's scroll area). Both
      // rectangles are read in the same frame, so their difference is a layout fact — the scroll
      // offset cancels out and never enters the number.
      const p = d.offsetParent instanceof HTMLElement ? d.offsetParent : document.body;
      const a = slot.el.getBoundingClientRect();
      const b = p.getBoundingClientRect();
      d.style.left = `${a.left - b.left}px`;
      d.style.top = `${a.top - b.top}px`;
      d.style.width = `${a.width}px`;
      d.style.height = `${a.height}px`;
    };
    place();
    // The slot's page position only moves when something in the layout moves (window size, zoom, a
    // reflow); these cover that. The scroll itself is not one of those, so it is never observed.
    const ro = new ResizeObserver(place);
    ro.observe(slot.el);
    const scroller = document.getElementById("content");
    if (scroller) ro.observe(scroller);
    window.addEventListener("resize", place);
    void document.fonts?.ready.then(place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
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
    repeat,
    rate,
    cycleRepeat,
    cycleRate: () => setSpeed(),
    setRate: setSpeed,
    playNext,
    addToQueue,
    play,
    adopt: (who) => setOwner(who),
    toggle: () => {
      const c = cur.current;
      if (!c) return;
      const p = player.current;
      if (!open) {
        allow("listen to this bhajan", () => {
          setOpen(true);
          load(c, true);
        });
        return;
      }
      if (!ready(p)) return;
      const st = p.getPlayerState();
      if (st === STATE.PLAYING || st === STATE.BUFFERING) p.pauseVideo(); // pausing never needs an account
      else if (p.getCurrentTime() >= c.end - 0.75) allow("listen to this bhajan", () => load(c, true));
      else allow("listen to this bhajan", () => p.playVideo());
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
    previous,
    goTo,
    restart: () => {
      const c = cur.current;
      if (!c) return;
      allow("listen to this bhajan", () => {
        setOpen(true);
        load(c, true);
      });
    },
    close,
    setSleep: (s) => setSleepState(s),
    registerSlot: (el, who) => {
      setSlot({ el, owner: who });
      return () => setSlot((s) => (s?.el === el ? null : s));
    },
    flash,
  };

  const length = current ? current.end - current.start : 1;
  const elapsed = current ? Math.min(Math.max(now - current.start, 0), length) : 0;
  const i = current ? queue.findIndex((x) => x.slug === current.slug) : -1;
  // next goes round the queue, so it is useful whenever there is more than this one bhajan
  const hasNext = i >= 0 && queue.length > 1;
  // The player is interactive exactly when it can be seen.
  const shown = Boolean(current) && (mini || visible);

  const dockEl = (
    <div
      ref={dock}
      aria-hidden={!current || (!mini && !visible) ? true : undefined}
      className={[
        isDocked ? "absolute" : "fixed",
        "z-40",
        // The stage it is portalled into ignores the pointer (it covers the whole page); the player
        // takes clicks back while it is on screen.
        shown ? "pointer-events-auto" : "pointer-events-none",
        shown ? "" : "invisible left-0 top-0 size-px opacity-0",
        isDocked ? `transition-opacity ${visible ? "opacity-100 delay-500 duration-700" : "opacity-0 duration-200"}` : "",
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
          {/* progress through the clip: drag it, or tap */}
          <Scrubber variant="thin" length={length} elapsed={elapsed} label="Position in this bhajan" onCommit={(t) => api.seekTo(current.start + t)} />
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
  );

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* The player box is drawn inside the page's scroll area, so the scroll clips and carries it. */}
      {mount && createPortal(dockEl, mount)}

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
