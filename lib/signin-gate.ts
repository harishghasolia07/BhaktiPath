"use client";
// One sign-in prompt for the whole site. Listening and liking need an account, so the player and the
// heart call askToSignIn(): the dialog in the root layout opens, and the same tap is finished once the
// visitor is signed in. Browsing never asks.
import { useSyncExternalStore } from "react";

export type SignInGate = {
  open: boolean;
  /** what the tap was for, e.g. "listen to this bhajan" */
  reason: string;
  /** the tap to finish once the visitor is signed in */
  then: (() => void) | null;
};

const CLOSED: SignInGate = { open: false, reason: "", then: null };
let gate: SignInGate = CLOSED;
const listeners = new Set<() => void>();

function set(next: SignInGate) {
  gate = next;
  listeners.forEach((l) => l());
}

/** A tap that needs an account: ask first, then finish it once the visitor is signed in. */
export function askToSignIn(reason: string, then?: () => void) {
  set({ open: true, reason, then: then ?? null });
}

export function closeSignIn() {
  set(CLOSED);
}

/** The dialog calls this when the visitor is signed in now: close it, and carry on with the tap. */
export function signedIn() {
  const then = gate.then;
  set(CLOSED);
  then?.();
}

export function useSignInGate(): SignInGate {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => gate,
    () => CLOSED,
  );
}
