"use client";

import { Heart } from "lucide-react";
import { useFavs } from "@/lib/local";

/** Keeps a bhajan among "my bhajans" on this device. Never put it inside a link. */
export function HeartButton({ slug, title, className = "" }: { slug: string; title: string; className?: string }) {
  const [favs, toggle] = useFavs();
  const on = favs.has(slug);
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from my bhajans` : `Add ${title} to my bhajans`}
      title={on ? "In my bhajans" : "Add to my bhajans"}
      className={`grid place-items-center rounded-full text-sandal transition-colors hover:text-marigold aria-pressed:text-marigold ${className}`}
    >
      <Heart className={`size-[18px] ${on ? "fill-current" : ""}`} aria-hidden="true" />
    </button>
  );
}
