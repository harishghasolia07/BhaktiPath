"use client";

import { deleteMyVideo } from "@/app/my/actions";

export function MyDeleteButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteMyVideo}
      onSubmit={(e) => {
        if (!window.confirm(`Remove “${title}” from your videos?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="h-11 rounded-full border border-gold/40 px-5 font-semibold text-sandal hover:border-gold hover:text-ivory">Remove this video</button>
    </form>
  );
}
