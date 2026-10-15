"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold text-sandal">Admin password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="h-12 rounded-[6px] border border-gold/40 bg-shyam px-3.5 text-ivory focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none"
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-[0.95rem] text-marigold">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="h-12 rounded-full bg-gold font-semibold text-shyam transition-opacity hover:bg-marigold disabled:opacity-60"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
