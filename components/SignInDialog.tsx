"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { refreshAccount } from "@/lib/account-client";
import { closeSignIn, signedIn, useSignInGate } from "@/lib/signin-gate";
import { AuthForms } from "./my/AuthForms";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * The sign-in prompt, shown over any page when a visitor who isn't signed in taps play or a heart.
 * Browsing stays open; only listening and liking ask who they are.
 */
export function SignInDialog({ google }: { google: boolean }) {
  const gate = useSignInGate();
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!gate.open) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeSignIn();
      if (e.key !== "Tab" || !panel.current) return;
      // keep Tab inside the dialog while it is open
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [gate.open]);

  /** An email sign-in (or sign-up) finished without leaving the page: refresh, then carry on. */
  const continueHere = useCallback(async () => {
    const acct = await refreshAccount();
    if (acct.status === "in") signedIn();
    else closeSignIn();
  }, []);

  if (!gate.open) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/75 backdrop-blur-[3px]">
      {/* min-h-full centres the panel when it fits, and lets it scroll from the top when the screen is short */}
      <div
        className="flex min-h-full items-center justify-center p-4 py-8"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeSignIn();
        }}
      >
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-title"
          className="relative w-full max-w-md rounded-[10px] border border-gold/40 bg-shyam p-6 text-center shadow-[0_24px_60px_rgb(0_0_0/0.6)] sm:p-8"
        >
          <button
            ref={closeButton}
            type="button"
            onClick={closeSignIn}
            aria-label="Close"
            title="Close"
            className="absolute right-2 top-2 grid size-10 place-items-center rounded-full text-sandal transition-colors hover:bg-shyam-lit hover:text-ivory"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <h2 id="signin-title" className="mt-1 font-serif text-[1.6rem] leading-tight text-ivory">
            Sign in to {gate.reason}
          </h2>
          <p className="mt-2 text-[0.95rem] text-sandal">
            Your likes and what you listen to stay with your account, so they are here on any device.
          </p>
          <div className="mt-5 flex flex-col items-center gap-4">
            {google && (
              <>
                <a
                  href={`/api/auth/google?to=${encodeURIComponent(path)}`}
                  className="inline-flex h-12 items-center rounded-full bg-gold px-7 font-semibold text-shyam no-underline hover:bg-marigold"
                >
                  Continue with Google
                </a>
                <p className="flex w-full max-w-sm items-center gap-3 text-[0.85rem] text-mist before:h-px before:flex-1 before:bg-gold/25 after:h-px after:flex-1 after:bg-gold/25">
                  or use your email
                </p>
              </>
            )}
            <AuthForms onSignedIn={continueHere} />
          </div>
        </div>
      </div>
    </div>
  );
}
