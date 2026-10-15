"use client";

import { Trash2 } from "lucide-react";
import { deleteClip } from "@/app/admin/actions";

export function DeleteButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteClip}
      onSubmit={(e) => {
        if (!window.confirm(`Delete “${title}”? Links already shared will stop working.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        aria-label={`Delete ${title}`}
        className="grid size-10 place-items-center rounded-full text-sandal hover:bg-velvet-lit hover:text-ivory"
      >
        <Trash2 className="size-[18px]" aria-hidden="true" />
      </button>
    </form>
  );
}
