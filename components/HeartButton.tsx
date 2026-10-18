"use client";

import { Heart } from "lucide-react";
import { useFavs } from "@/lib/local";

/** Keeps a bhajan among the liked ones (in the account when signed in, otherwise on this device). Never put it inside a link. */
export function HeartButton({ slug, title, className = "" }: { slug: string; title: string; className?: string }) {
  const [favs, toggle] = useFavs();
  const on = favs.has(slug);
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from liked bhajans` : `Add ${title} to liked bhajans`}
      title={on ? "Liked" : "Like"}
      className={`grid place-items-center rounded-full text-sandal transition-colors hover:text-marigold aria-pressed:text-marigold ${className}`}
    >
      <Heart className={`size-[18px] ${on ? "fill-current" : ""}`} aria-hidden="true" />
    </button>
  );
}
