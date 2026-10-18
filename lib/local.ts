"use client";
// Per-device memory: which bhajans were heard here (lights their diya) and
// the player toggles. Everything is wrapped so private windows still work.
import { useCallback, useSyncExternalStore } from "react";
import { isNewClip, type Resume } from "./resume";
import { accountMarkPlayed, accountToggleFav, getAccount, useAccount } from "./account-client";

const PLAYED = "sk:played";
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

// Signed in: likes and history belong to the account. Signed out: they stay on this device.
export function usePlayed(): Set<string> {
  const acct = useAccount();
  const raw = useSyncExternalStore(subscribe, () => read(PLAYED) ?? "", () => "");
  return new Set(acct.status === "in" ? acct.played : raw ? raw.split(",") : []);
}

const RECENT = "sk:recent";
const FAVS = "sk:favs";
const list = (raw: string | null) => (raw ? raw.split(",").filter(Boolean) : []);

export function markPlayed(slug: string) {
  if (getAccount().status === "in") return accountMarkPlayed(slug);
  const s = new Set(list(read(PLAYED)));
  if (!s.has(slug)) {
    s.add(slug);
    write(PLAYED, [...s].join(","));
  }
  // most recent first, no repeats, the last 30
  write(RECENT, [slug, ...list(read(RECENT)).filter((x) => x !== slug)].slice(0, 30).join(","));
}

/** Slugs of recently played bhajans, newest first. */
export function useRecent(): string[] {
  const acct = useAccount();
  const raw = useSyncExternalStore(subscribe, () => read(RECENT) ?? "", () => "");
  return acct.status === "in" ? acct.recent : list(raw);
}

/** Favourite bhajans on this device: the set, and a toggle. */
export function useFavs(): [Set<string>, (slug: string) => void] {
  const acct = useAccount();
  const raw = useSyncExternalStore(subscribe, () => read(FAVS) ?? "", () => "");
  const toggle = useCallback((slug: string) => {
    if (getAccount().status === "in") return accountToggleFav(slug);
    const cur = list(read(FAVS));
    write(FAVS, (cur.includes(slug) ? cur.filter((x) => x !== slug) : [slug, ...cur]).join(","));
  }, []);
  return [new Set(acct.status === "in" ? acct.favs : list(raw)), toggle];
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
