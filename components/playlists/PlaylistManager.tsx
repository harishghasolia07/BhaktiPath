"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Copy, Play, Plus, Shuffle, Trash2, X } from "lucide-react";
import { deletePlaylist, moveInPlaylist, removeFromPlaylist, renamePlaylist, setPlaylistPublic } from "@/app/playlists/actions";
import { usePlayer } from "../PlayerProvider";
import { PlaylistPicker } from "../PlaylistPicker";
import { refreshAccount } from "@/lib/account-client";
import type { Clip } from "@/lib/clip-schema";
import { clipHref, langOf } from "@/lib/display";
import { shuffled } from "@/lib/shuffle";
import { formatLength } from "@/lib/youtube";

export type Row = { key: string; clip: Clip | null };

/** Your own playlist: rename it, reorder or remove its bhajans, play it, share it by link. */
export function PlaylistManager({ id, name, isPublic, rows, available }: { id: string; name: string; isPublic: boolean; rows: Row[]; available: Clip[] }) {
  const router = useRouter();
  const player = usePlayer();
  const [title, setTitle] = useState(name);
  const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const clips = rows.flatMap((r) => (r.clip ? [r.clip] : []));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return setMsg(res.error ?? "Couldn't do that.");
      setMsg("");
      refreshAccount();
      router.refresh();
      after?.();
    });

  const play = (list: Clip[]) => {
    if (!list.length) return;
    player.play(list, list[0].slug, "playlist");
    router.push(clipHref(list[0]));
  };
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/playlists/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => renamePlaylist(id, title), () => setMsg("Saved."));
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Playlist name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            className="h-12 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 font-serif text-[1.4rem] text-ivory focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none"
          />
        </label>
        <button disabled={pending || !title.trim() || title.trim() === name} className="h-12 rounded-full border border-gold/50 px-5 font-semibold text-ivory hover:border-gold disabled:opacity-50">
          Save name
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!clips.length}
          onClick={() => play(clips)}
          className="flex h-11 items-center gap-2 rounded-full bg-marigold px-5 font-semibold text-velvet-deep hover:bg-[#ffb32e] disabled:opacity-50"
        >
          <Play className="size-4 fill-current" aria-hidden="true" /> Play all {clips.length}
        </button>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-11 items-center gap-2 rounded-full border border-gold/60 px-5 font-semibold text-ivory hover:border-gold hover:bg-shyam-lit"
        >
          <Plus className="size-4" aria-hidden="true" /> Add bhajans
        </button>
        <button
          type="button"
          disabled={clips.length < 2}
          onClick={() => play(shuffled(clips))}
          aria-label="Shuffle and play"
          className="grid size-11 place-items-center rounded-full border border-gold/50 text-sandal hover:border-gold hover:text-ivory disabled:opacity-50"
        >
          <Shuffle className="size-[18px]" aria-hidden="true" />
        </button>
      </div>

      <section aria-labelledby="share" className="rounded-[10px] border border-gold/30 p-4">
        <h2 id="share" className="font-semibold text-ivory">
          Sharing
        </h2>
        <label className="mt-2 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isPublic}
            disabled={pending}
            onChange={(e) => run(() => setPlaylistPublic(id, e.target.checked))}
            className="mt-1 size-4 accent-[var(--color-marigold)]"
          />
          <span>
            <span className="block text-ivory">Anyone with the link can play this playlist</span>
            <span className="block text-[0.9rem] text-sandal">Your own private videos are skipped for everyone else. Switch it off to keep the list to yourself.</span>
          </span>
        </label>
        {isPublic && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setMsg("Link copied.");
              } catch {
                setMsg(link);
              }
            }}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-gold/50 px-4 text-ivory hover:border-gold"
          >
            <Copy className="size-4" aria-hidden="true" /> Copy link
          </button>
        )}
      </section>

      {rows.length === 0 ? (
        <p className="rounded-[8px] border border-gold/25 p-5 text-sandal">Nothing here yet. Press “Add bhajans” above to pick some.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map(({ key, clip }, i) => (
            <li key={key} className="flex items-center gap-2 rounded-[8px] border border-gold/20 bg-shyam/50 p-2 pl-3">
              <span className="tabular w-6 shrink-0 text-[0.85rem] text-mist">{i + 1}</span>
              <span className="min-w-0 flex-1">
                {clip ? (
                  <Link href={clipHref(clip)} lang={langOf(clip.title)} className="block truncate font-serif text-[1.05rem] text-ivory no-underline hover:text-marigold">
                    {clip.title}
                  </Link>
                ) : (
                  <span className="block truncate text-mist">A bhajan that is no longer available</span>
                )}
                {clip && <span className="tabular text-[0.8rem] text-mist">{formatLength(clip.end - clip.start)}{clip.owner ? " · yours" : ""}</span>}
              </span>
              <button aria-label={`Move ${clip?.title ?? "this bhajan"} up`} disabled={pending || i === 0} onClick={() => run(() => moveInPlaylist(id, key, "up"))} className="grid size-9 place-items-center rounded-full text-sandal hover:text-ivory disabled:opacity-30">
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
              <button aria-label={`Move ${clip?.title ?? "this bhajan"} down`} disabled={pending || i === rows.length - 1} onClick={() => run(() => moveInPlaylist(id, key, "down"))} className="grid size-9 place-items-center rounded-full text-sandal hover:text-ivory disabled:opacity-30">
                <ArrowDown className="size-4" aria-hidden="true" />
              </button>
              <button aria-label={`Remove ${clip?.title ?? "this bhajan"} from the playlist`} disabled={pending} onClick={() => run(() => removeFromPlaylist(id, key))} className="grid size-9 place-items-center rounded-full text-sandal hover:text-ivory">
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center gap-4 border-t border-gold/20 pt-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete the playlist “${name}”? The bhajans themselves stay.`)) run(() => deletePlaylist(id), () => router.push("/kathas"));
          }}
          className="inline-flex items-center gap-2 text-[0.95rem] text-mist underline decoration-gold/30 hover:text-ivory hover:decoration-gold"
        >
          <Trash2 className="size-4" aria-hidden="true" /> Delete this playlist
        </button>
        {msg && (
          <span role="status" className="inline-flex items-center gap-1.5 text-[0.9rem] text-sandal">
            {msg === "Saved." || msg === "Link copied." ? <Check className="size-4 text-marigold" aria-hidden="true" /> : null}
            {msg}
          </span>
        )}
      </div>
      {adding && <PlaylistPicker playlistId={id} name={name} clips={available} onClose={() => setAdding(false)} onChanged={() => router.refresh()} />}
    </div>
  );
}
