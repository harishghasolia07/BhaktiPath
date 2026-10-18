"use client";

import { useActionState } from "react";
import { forgotPassword } from "@/app/my/auth-actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);
  if (state?.done)
    return (
      <p role="status" className="rounded-[8px] border border-gold/30 p-4 text-sandal">
        If there is a password account for <strong className="text-ivory">{state.email}</strong>, we&apos;ve emailed it a link. It works for one hour. Check your spam folder too.
      </p>
    );
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4 text-left">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold text-sandal">Your email</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.email} className="h-12 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 text-ivory focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none" />
      </label>
      {state?.error && (
        <p role="alert" className="text-[0.95rem] text-marigold">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="h-12 rounded-full bg-gold font-semibold text-shyam hover:bg-marigold disabled:opacity-60">
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
