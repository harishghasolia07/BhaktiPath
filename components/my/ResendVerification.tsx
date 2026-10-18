"use client";

import { useState, useTransition } from "react";
import { resendVerification } from "@/app/my/auth-actions";

export function ResendVerification() {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <span>
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await resendVerification()).message))} className="underline decoration-gold/50 hover:text-ivory hover:decoration-gold disabled:opacity-60">
        {pending ? "Sending…" : "Send it again"}
      </button>
      {msg && (
        <span role="status" className="ml-2 text-mist">
          {msg}
        </span>
      )}
    </span>
  );
}
