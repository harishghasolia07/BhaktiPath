"use client";

import Link from "next/link";
import type { Clip } from "@/lib/clip-schema";
import { requestAutoplay } from "@/lib/local";
import { thumbnailUrl } from "@/lib/youtube";
import { Shrine, shrineMaxWidth } from "./Shrine";

/** The home page's shrine: the newest clip behind a closed pat. Tapping it opens the darshan. */
export function ShrineLink({ clip }: { clip: Clip }) {
  return (
    <Link
      href={`/clip/${clip.slug}`}
      onClick={() => requestAutoplay(clip.slug)}
      aria-label={`Play ${clip.title}`}
      className="block w-full"
      style={{ maxWidth: shrineMaxWidth("9.5rem") }}
    >
      <Shrine
        open={false}
        behind={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl(clip.videoId, "hq")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-85" />
        }
      >
        <span className="absolute inset-0 flex items-center justify-center pt-[4%]">
          <span className="flex items-center gap-2.5 rounded-full border border-gold/80 bg-shyam/90 px-5 py-2.5 text-[1.05rem] font-semibold text-ivory shadow-[0_8px_20px_rgb(0_0_0/0.45)]">
            <svg viewBox="0 0 16 16" className="size-4 fill-marigold" aria-hidden="true">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
            Open the darshan
          </span>
        </span>
      </Shrine>
    </Link>
  );
}
