"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/my/auth-actions";

const field =
  "h-12 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 text-ivory placeholder:text-mist/70 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-marigold";

/** Sign in or create an account with an email and password. */
export function AuthForms() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState(signIn, undefined);
  const [upState, upAction, upPending] = useActionState(signUp, undefined);
  const up = mode === "up";
  const state = up ? upState : inState;
  const err = state?.fields ?? {};
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-left">
      <div role="tablist" aria-label="Email and password" className="grid grid-cols-2 gap-1 rounded-full border border-gold/30 p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className="h-10 rounded-full font-semibold text-sandal aria-selected:bg-gold aria-selected:text-shyam"
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form key={mode} action={up ? upAction : inAction} className="flex flex-col gap-4">
        {up && (
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-sandal">Your name</span>
            <input name="name" autoComplete="name" required maxLength={60} defaultValue={upState?.name} aria-invalid={Boolean(err.name)} className={field} />
            {err.name && <span className="text-[0.9rem] text-marigold">{err.name}</span>}
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-sandal">Email</span>
          <input name="email" type="email" autoComplete="email" required defaultValue={state?.email} aria-invalid={Boolean(err.email)} className={field} />
          {err.email && <span className="text-[0.9rem] text-marigold">{err.email}</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-sandal">Password {up && <span className="font-normal text-mist">(8 or more characters)</span>}</span>
          <input
            name="password"
            type="password"
            autoComplete={up ? "new-password" : "current-password"}
            required
            minLength={up ? 8 : undefined}
            maxLength={200}
            aria-invalid={Boolean(err.password)}
            className={field}
          />
          {err.password && <span className="text-[0.9rem] text-marigold">{err.password}</span>}
        </label>
        {state?.error && (
          <p role="alert" className="text-[0.95rem] text-marigold">
            {state.error}
          </p>
        )}
        <button disabled={up ? upPending : inPending} className="h-12 rounded-full bg-gold font-semibold text-shyam transition-opacity hover:bg-marigold disabled:opacity-60">
          {(up ? upPending : inPending) ? "Please wait…" : up ? "Create my account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
