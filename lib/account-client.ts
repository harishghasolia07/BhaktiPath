"use client";
// The signed-in person as the browser sees it: who they are, and their likes and history. Loaded once from
// /api/me; likes and plays change here first (instantly) and are sent to the server in the background.
import { useSyncExternalStore } from "react";
import type { Clip } from "./clip-schema";
import type { Playlist } from "./playlists";

export type Account = {
  status: "loading" | "out" | "in";
  user: { name: string; email: string; picture: string } | null;
  favs: string[];
  recent: string[];
  played: string[];
  /** The person's own videos (private to them). */
  videos: Clip[];
  playlists: PlaylistLite[];
};

/** What the browser needs of a playlist. */
export type PlaylistLite = Pick<Playlist, "id" | "name" | "items" | "public">;

const LOADING: Account = { status: "loading", user: null, favs: [], recent: [], played: [], videos: [], playlists: [] };
let state: Account = LOADING;
let started = false;
const listeners = new Set<() => void>();

function set(next: Account) {
  state = next;
  listeners.forEach((l) => l());
}

function load() {
  if (started) return;
  started = true;
  refreshAccount();
}

type Me = { user: Account["user"]; favs?: string[]; recent?: string[]; played?: string[]; videos?: Clip[]; playlists?: PlaylistLite[] };

let inflight: Promise<Account> | null = null;

async function ask(): Promise<Account> {
  try {
    const r = await fetch("/api/me", { cache: "no-store" });
    const d = (await r.json()) as Me;
    return d.user
      ? { status: "in", user: d.user, favs: d.favs ?? [], recent: d.recent ?? [], played: d.played ?? [], videos: d.videos ?? [], playlists: d.playlists ?? [] }
      : { ...LOADING, status: "out" };
  } catch {
    return { ...LOADING, status: "out" };
  }
}

/** Ask the server who is signed in now (after an email sign-in or sign-up, which doesn't reload the page). */
export function refreshAccount(): Promise<Account> {
  started = true;
  const p = ask().then((next) => {
    if (inflight === p) inflight = null;
    set(next);
    return next;
  });
  inflight = p;
  return p;
}

/** The account, waiting for the first answer when it hasn't arrived yet — never the "loading" placeholder. */
export function ensureAccount(): Promise<Account> {
  if (state.status !== "loading") return Promise.resolve(state);
  return inflight ?? refreshAccount();
}

export function getAccount(): Account {
  return state;
}

export function useAccount(): Account {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      load();
      return () => listeners.delete(cb);
    },
    () => state,
    () => LOADING,
  );
}

function send(path: string, body: unknown) {
  fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
}

export function accountToggleFav(key: string) {
  const on = !state.favs.includes(key);
  set({ ...state, favs: on ? [key, ...state.favs] : state.favs.filter((x) => x !== key) });
  send("/api/me/favs", { key, on });
}

export function accountMarkPlayed(key: string) {
  set({
    ...state,
    recent: [key, ...state.recent.filter((x) => x !== key)].slice(0, 30),
    played: state.played.includes(key) ? state.played : [...state.played, key],
  });
  send("/api/me/played", { key });
}
