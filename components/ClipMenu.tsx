"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, Check, ListEnd, ListPlus, ListVideo, MoreHorizontal, Plus, Share2 } from "lucide-react";
import { addToPlaylist, createPlaylist, removeFromPlaylist } from "@/app/playlists/actions";
import { refreshAccount, useAccount } from "@/lib/account-client";
import type { Clip } from "@/lib/clip-schema";
import { langOf } from "@/lib/display";
import { usePlayer } from "./PlayerProvider";

/**
 * The "⋯" menu on a bhajan: play it next, add it to the queue, or put it in one of your playlists.
 * With `onShare`, phones also get a Share item (bigger screens show Share as its own button).
 */
export function ClipMenu({ clip, className = "", onShare }: { clip: Clip; className?: string; onShare?: () => void }) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [view, setView] = useState<"main" | "lists">("main");
  const menu = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  useEffect(() => {
    if (!anchor) return;
    const close = () => {
      setAnchor(null);
      setView("main");
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !anchor.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (close(), anchor.focus());
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [anchor]);

  return (
    <>
      <button
        type="button"
        aria-label={`More options for ${clip.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More"
        onClick={(e) => (open ? (setAnchor(null), setView("main")) : setAnchor(e.currentTarget))}
        className={`grid place-items-center rounded-full text-sandal transition-colors hover:text-marigold aria-expanded:text-marigold ${className}`}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {anchor && createPortal(<MenuBody anchor={anchor} clip={clip} onShare={onShare} view={view} setView={setView} close={() => (setAnchor(null), setView("main"))} menuRef={menu} />, document.body)}
    </>
  );
}

function MenuBody({
  anchor,
  clip,
  onShare,
  view,
  setView,
  close,
  menuRef,
}: {
  anchor: HTMLElement;
  clip: Clip;
  onShare?: () => void;
  view: "main" | "lists";
  setView: (v: "main" | "lists") => void;
  close: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const p = usePlayer();
  const acct = useAccount();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const r = anchor.getBoundingClientRect();
  // phones: a sheet along the bottom of the screen, easy to reach with a thumb
  const sheet = window.innerWidth < 640;
  const W = 272;
  const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
  const below = window.innerHeight - r.bottom > 320 || r.top < 320;
  const pos = below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 };

  const item = `flex w-full items-center gap-3 rounded-[6px] px-3 text-left text-ivory hover:bg-shyam-lit focus-visible:bg-shyam-lit focus-visible:outline-none ${sheet ? "min-h-12 py-3 text-[1.05rem]" : "py-2.5"}`;

  function toggle(listId: string, listName: string, has: boolean) {
    setError("");
    start(async () => {
      const res = has ? await removeFromPlaylist(listId, clip.slug) : await addToPlaylist(listId, clip.slug);
      if (!res.ok) return setError(res.error ?? "Couldn't do that.");
      refreshAccount();
      p.flash(has ? `Removed from “${listName}”` : `Added to “${listName}”`);
    });
  }
  function create() {
    setError("");
    start(async () => {
      const made = await createPlaylist(name);
      if (!made.ok || !made.id) return setError(made.error ?? "Couldn't make the playlist.");
      const res = await addToPlaylist(made.id, clip.slug);
      refreshAccount();
      if (!res.ok) return setError(res.error ?? "Couldn't add it.");
      p.flash(`Added to “${name.trim()}”`);
      setName("");
    });
  }

  return (
    <>
    {sheet && <div aria-hidden="true" className="fixed inset-0 z-[59] bg-black/55 motion-safe:animate-[fade-in_150ms_ease-out]" />}
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Options for ${clip.title}`}
      style={sheet ? undefined : { ...pos, left, width: W }}
      className={
        sheet
          ? "fixed inset-x-0 bottom-0 z-[60] max-h-[75dvh] overflow-y-auto rounded-t-[18px] border-t border-gold/50 bg-shyam px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_40px_-8px_rgb(0_0_0/0.75)] motion-safe:animate-[sheet-up_200ms_cubic-bezier(0.16,1,0.3,1)]"
          : "fixed z-[60] max-h-[min(24rem,calc(100dvh-1rem))] overflow-y-auto rounded-[10px] border border-gold/50 bg-shyam p-1.5 shadow-[0_18px_40px_-8px_rgb(0_0_0/0.75)]"
      }
    >
      {sheet && (
        <div className="mb-1 flex flex-col items-center gap-2 px-1">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-gold/40" />
          <p lang={langOf(clip.title)} className="w-full truncate text-center font-serif text-[1.05rem] text-sandal">
            {clip.title}
          </p>
        </div>
      )}
      {view === "main" ? (
        <>
          <button role="menuitem" className={item} onClick={() => (p.playNext(clip), close())}>
            <ListVideo className="size-[18px] text-gold" aria-hidden="true" /> Play next
          </button>
          <button role="menuitem" className={item} onClick={() => (p.addToQueue(clip), close())}>
            <ListEnd className="size-[18px] text-gold" aria-hidden="true" /> Add to queue
          </button>
          <button role="menuitem" className={item} onClick={() => setView("lists")}>
            <ListPlus className="size-[18px] text-gold" aria-hidden="true" /> Add to playlist…
          </button>
          {sheet && onShare && (
            <button role="menuitem" className={item} onClick={() => (close(), onShare())}>
              <Share2 className="size-[18px] text-gold" aria-hidden="true" /> Share
            </button>
          )}
        </>
      ) : (
        <>
          <button role="menuitem" className={`${item} font-semibold`} onClick={() => setView("main")}>
            <ChevronLeft className="size-[18px] text-gold" aria-hidden="true" /> Add to playlist
          </button>
          {acct.status !== "in" ? (
            <p className="px-3 py-2.5 text-[0.95rem] text-sandal">
              <Link href="/my" className="text-ivory underline decoration-gold/50" onClick={close}>
                Sign in
              </Link>{" "}
              to make playlists.
            </p>
          ) : (
            <>
              {acct.playlists.map((l) => {
                const has = l.items.includes(clip.slug);
                return (
                  <button key={l.id} role="menuitemcheckbox" aria-checked={has} disabled={pending} className={item} onClick={() => toggle(l.id, l.name, has)}>
                    <span className="grid size-[18px] place-items-center">{has && <Check className="size-[18px] text-marigold" aria-hidden="true" />}</span>
                    <span className="min-w-0 flex-1 truncate">{l.name}</span>
                    <span className="tabular text-[0.8rem] text-mist">{l.items.length}</span>
                  </button>
                );
              })}
              <form
                className="mt-1 flex items-center gap-1.5 border-t border-gold/20 px-1 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) create();
                }}
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New playlist"
                  aria-label="New playlist name"
                  maxLength={60}
                  className="h-10 min-w-0 flex-1 rounded-full border border-gold/30 bg-shyam-lit px-3.5 text-ivory placeholder:text-mist/80 focus:border-marigold focus:outline-none"
                />
                <button disabled={pending || !name.trim()} aria-label="Create the playlist and add this bhajan" className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-shyam hover:bg-marigold disabled:opacity-50">
                  <Plus className="size-[18px]" aria-hidden="true" />
                </button>
              </form>
              {error && (
                <p role="alert" className="px-3 pt-2 text-[0.85rem] text-marigold">
                  {error}
                </p>
              )}
            </>
          )}
        </>
      )}
      {sheet && (
        <button type="button" onClick={close} className="mt-2 h-12 w-full rounded-full border border-gold/40 font-semibold text-sandal">
          Cancel
        </button>
      )}
    </div>
    </>
  );
}
