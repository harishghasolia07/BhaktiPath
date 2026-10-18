"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/my/auth-actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  const err = state?.fields ?? {};
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4 text-left">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold text-sandal">
          New password <span className="font-normal text-mist">(8 or more characters)</span>
        </span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={200} aria-invalid={Boolean(err.password)} className="h-12 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 text-ivory focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-marigold" />
        {err.password && <span className="text-[0.9rem] text-marigold">{err.password}</span>}
      </label>
      {state?.error && (
        <p role="alert" className="text-[0.95rem] text-marigold">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="h-12 rounded-full bg-gold font-semibold text-shyam hover:bg-marigold disabled:opacity-60">
        {pending ? "Saving…" : "Set new password and sign in"}
      </button>
    </form>
  );
}
