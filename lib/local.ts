"use client";
// Per-device memory: which bhajans were heard here (lights their diya) and
// the player toggles. Everything is wrapped so private windows still work.
import { useCallback, useSyncExternalStore } from "react";
import { nextRepeat, nextSpeed, readRepeat, readSpeed, type Repeat } from "./player-rules";
import { isNewClip, type Resume } from "./resume";
import { accountMarkPlayed, accountToggleFav, ensureAccount, getAccount, useAccount } from "./account-client";
import { askToSignIn } from "./signin-gate";

const EVT = "sk:local";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(EVT));
}
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

// Likes and history belong to the account. Signed out there is nothing to keep on the device: listening
// and liking both ask for a sign-in first (lib/signin-gate), so the local lists were a hole — not a feature.
export function usePlayed(): Set<string> {
  const acct = useAccount();
  return new Set(acct.played);
}

export function markPlayed(slug: string) {
  if (getAccount().status === "in") accountMarkPlayed(slug);
}

/** Slugs of recently played bhajans, newest first. */
export function useRecent(): string[] {
  return useAccount().recent;
}

/** Liked bhajans: the set, and a toggle that asks a signed-out visitor to sign in first. */
export function useFavs(): [Set<string>, (slug: string) => void] {
  const acct = useAccount();
  const toggle = useCallback((slug: string) => {
    if (getAccount().status === "in") return accountToggleFav(slug);
    // Signed out: ask, and like it once they are in (unless the account already has it).
    const like = () => {
      if (!getAccount().favs.includes(slug)) accountToggleFav(slug);
    };
    void ensureAccount().then((who) => (who.status === "in" ? like() : askToSignIn("like this bhajan", like)));
  }, []);
  return [new Set(acct.favs), toggle];
}

/* ---- continue where I left off (this device) ---- */
const RESUME = "sk:resume";

/** Remember how far into a clip we are. Quiet: no event, it runs every few seconds while playing. */
export function saveResume(slug: string, t: number) {
  try {
    localStorage.setItem(RESUME, JSON.stringify({ slug, t: Math.floor(t), at: Date.now() } satisfies Resume));
  } catch {}
}
export function clearResume(slug: string) {
  try {
    const r = JSON.parse(localStorage.getItem(RESUME) ?? "null") as Resume | null;
    if (r?.slug === slug) localStorage.removeItem(RESUME);
  } catch {}
}
export function useResume(): Resume | null {
  const raw = useSyncExternalStore(subscribe, () => read(RESUME), () => null);
  try {
    return raw ? (JSON.parse(raw) as Resume) : null;
  } catch {
    return null;
  }
}

/** A "Continue" tap asks the next player start of this clip to begin at that second (valid for 20 seconds). */
export function requestResumeAt(slug: string, t: number) {
  try {
    sessionStorage.setItem("sk:resumeAt", JSON.stringify({ slug, t, at: Date.now() }));
  } catch {}
}
export function peekResumeAt(slug: string): number | null {
  try {
    const r = JSON.parse(sessionStorage.getItem("sk:resumeAt") ?? "null") as Resume | null;
    return r && r.slug === slug && Date.now() - r.at < 20_000 ? r.t : null;
  } catch {
    return null;
  }
}
export function clearResumeAt() {
  try {
    sessionStorage.removeItem("sk:resumeAt");
  } catch {}
}

/* ---- "New": clips added since this device's previous visit ---- */
let newSince: number | null = null;
function previousVisit(): number {
  if (newSince !== null) return newSince;
  try {
    const kept = sessionStorage.getItem("sk:newSince");
    if (kept !== null) newSince = Number(kept);
    else {
      newSince = Number(localStorage.getItem("sk:lastVisit") ?? 0) || 0;
      sessionStorage.setItem("sk:newSince", String(newSince));
      localStorage.setItem("sk:lastVisit", String(Date.now()));
    }
  } catch {
    newSince = 0;
  }
  return newSince;
}
/** Returns a function telling whether a clip is new to this visitor (nothing is new on a first visit). */
export function useIsNew(): (createdAt: string) => boolean {
  const since = useSyncExternalStore(() => () => {}, previousVisit, () => 0);
  return (createdAt) => isNewClip(createdAt, since);
}

/** Repeat mode: off, repeat the whole list, or repeat this bhajan. */
export function useRepeat(): [Repeat, () => void] {
  const raw = useSyncExternalStore(subscribe, () => read("sk:repeat") ?? "", () => "");
  const legacy = useSyncExternalStore(subscribe, () => read("sk:loop") ?? "", () => "");
  const cycle = useCallback(() => write("sk:repeat", nextRepeat(readRepeat(read("sk:repeat"), read("sk:loop")))), []);
  return [readRepeat(raw || null, legacy || null), cycle];
}

/** Playback speed (YouTube's 0.25× to 2×) and a way to cycle it or set one. */
export function useSpeed(): [number, (v?: number) => void] {
  const raw = useSyncExternalStore(subscribe, () => read("sk:speed") ?? "", () => "");
  const set = useCallback((v?: number) => {
    const next = v === undefined ? nextSpeed(readSpeed(read("sk:speed"))) : readSpeed(String(v));
    write("sk:speed", String(next));
  }, []);
  return [readSpeed(raw || null), set];
}

export function usePref(key: "loop" | "autonext", fallback: boolean): [boolean, (v: boolean) => void] {
  const k = `sk:${key}`;
  const raw = useSyncExternalStore(subscribe, () => read(k), () => null);
  const value = raw === null ? fallback : raw === "1";
  const set = useCallback((v: boolean) => write(k, v ? "1" : "0"), [k]);
  return [value, set];
}

/** A card or row tapped on this site asks the clip page to open the pat straight away. */
export function requestAutoplay(slug: string) {
  try {
    sessionStorage.setItem("sk:autoplay", slug);
  } catch {}
}
export function takeAutoplay(slug: string): boolean {
  try {
    if (sessionStorage.getItem("sk:autoplay") !== slug) return false;
    sessionStorage.removeItem("sk:autoplay");
    return true;
  } catch {
    return false;
  }
}
