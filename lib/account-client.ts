"use client";
// The signed-in person as the browser sees it: who they are, and their likes and history. Loaded once from
// /api/me; likes and plays change here first (instantly) and are sent to the server in the background.
import { useSyncExternalStore } from "react";
import type { Clip } from "./clip-schema";

export type Account = {
  status: "loading" | "out" | "in";
  user: { name: string; email: string; picture: string } | null;
  favs: string[];
  recent: string[];
  played: string[];
  /** The person's own videos (private to them). */
  videos: Clip[];
};

const LOADING: Account = { status: "loading", user: null, favs: [], recent: [], played: [], videos: [] };
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

/** Ask the server who is signed in now (after an email sign-in or sign-up, which doesn't reload the page). */
export function refreshAccount() {
  started = true;
  fetch("/api/me", { cache: "no-store" })
    .then((r) => r.json() as Promise<{ user: Account["user"]; favs?: string[]; recent?: string[]; played?: string[]; videos?: Clip[] }>)
    .then((d) => set(d.user ? { status: "in", user: d.user, favs: d.favs ?? [], recent: d.recent ?? [], played: d.played ?? [], videos: d.videos ?? [] } : { ...LOADING, status: "out" }))
    .catch(() => set({ ...LOADING, status: "out" }));
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
