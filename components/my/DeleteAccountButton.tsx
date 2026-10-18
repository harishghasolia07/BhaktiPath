"use client";

import { deleteAccount } from "@/app/my/actions";

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        if (!window.confirm("Delete your account? Your likes, history and every video you added will be removed for good.")) e.preventDefault();
      }}
    >
      <button className="text-[0.9rem] text-mist underline decoration-gold/30 hover:text-ivory hover:decoration-gold">Delete my account and data</button>
    </form>
  );
}
