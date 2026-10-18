"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Search, X } from "lucide-react";
import { addToPlaylist, removeFromPlaylist } from "@/app/playlists/actions";
import { refreshAccount, useAccount } from "@/lib/account-client";
import { CATEGORY_LABELS, type Clip } from "@/lib/clip-schema";
import { langOf } from "@/lib/display";
import { matchesQuery } from "@/lib/translit";
import { formatLength, thumbnailUrl } from "@/lib/youtube";

/**
 * "Add bhajans" from inside a playlist: every bhajan you can use, with a search box. Tap one to put it in the
 * playlist (tap again to take it out). It stays open, so you can pick several, then press Done.
 */
export function PlaylistPicker({ playlistId, name, clips, onClose, onChanged }: { playlistId: string; name: string; clips: Clip[]; onClose: () => void; onChanged?: () => void }) {
  const acct = useAccount();
  const [q, setQ] = useState("");
  const [busy, startBusy] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const inList = new Set(acct.playlists.find((l) => l.id === playlistId)?.items ?? []);
  const shown = clips.filter((c) => matchesQuery(`${c.title} ${c.tags.join(" ")}`, q));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function toggle(c: Clip) {
    setError("");
    setPendingKey(c.slug);
    startBusy(async () => {
      const res = inList.has(c.slug) ? await removeFromPlaylist(playlistId, c.slug) : await addToPlaylist(playlistId, c.slug);
      if (!res.ok) setError(res.error ?? "Couldn't do that.");
      refreshAccount();
      onChanged?.();
      setPendingKey(null);
    });
  }

  const added = clips.filter((c) => inList.has(c.slug)).length;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Add bhajans to ${name}`}
        className="flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[18px] border border-gold/50 bg-shyam shadow-[0_24px_60px_-10px_rgb(0_0_0/0.8)] sm:max-h-[80dvh] sm:rounded-[14px]"
      >
        <div className="flex items-center gap-3 border-b border-gold/30 px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate font-serif text-[1.3rem] text-ivory">Add to “{name}”</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-full bg-gold px-5 font-semibold text-shyam hover:bg-marigold">
            Done{added ? ` · ${added}` : ""}
          </button>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-10 place-items-center rounded-full text-sandal hover:text-ivory">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <label className="relative mx-4 mt-3 block">
          <span className="sr-only">Search bhajans</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-mist" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bhajans"
            className="h-11 w-full rounded-full border border-gold/30 bg-shyam-lit pl-10 pr-4 text-ivory placeholder:text-mist/80 focus:border-marigold focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        {error && (
          <p role="alert" className="px-4 pt-2 text-[0.9rem] text-marigold">
            {error}
          </p>
        )}
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {shown.length === 0 && <li className="px-3 py-8 text-center text-mist">Nothing matches “{q.trim()}”.</li>}
          {shown.map((c) => {
            const on = inList.has(c.slug);
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${on ? "Remove" : "Add"} ${c.title}`}
                  disabled={busy && pendingKey === c.slug}
                  onClick={() => toggle(c)}
                  className="flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left hover:bg-shyam-lit focus-visible:bg-shyam-lit focus-visible:outline-none disabled:opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl(c.videoId, "mq")} alt="" loading="lazy" className="aspect-video w-[5.5rem] shrink-0 rounded-[5px] object-cover" />
                  <span className="min-w-0 flex-1">
                    <span lang={langOf(c.title)} className="line-clamp-2 block font-serif text-[1.02rem] leading-snug text-ivory">
                      {c.title}
                    </span>
                    <span className="tabular text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-mist">
                      {CATEGORY_LABELS[c.category].en} · {formatLength(c.end - c.start)}
                      {c.owner ? " · yours" : ""}
                    </span>
                  </span>
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full border ${on ? "border-marigold bg-marigold text-velvet-deep" : "border-gold/50 text-gold"}`}
                    aria-hidden="true"
                  >
                    {on ? <Check className="size-[18px]" /> : <Plus className="size-[18px]" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
