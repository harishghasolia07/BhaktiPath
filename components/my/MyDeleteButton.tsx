"use client";

import { deleteMyVideo } from "@/app/my/actions";

export function MyDeleteButton({ id, title, approved = false }: { id: string; title: string; approved?: boolean }) {
  return (
    <form
      action={deleteMyVideo}
      onSubmit={(e) => {
        const note = approved ? "\n\nThis video is already in the Katha Sangraha for everyone. Removing it here only removes your own copy; the site owner has to remove it from the Katha Sangraha." : "";
        if (!window.confirm(`Remove “${title}” from your videos?${note}`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="h-11 rounded-full border border-gold/40 px-5 font-semibold text-sandal hover:border-gold hover:text-ivory">Remove this video</button>
    </form>
  );
}
