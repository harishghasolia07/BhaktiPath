"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Flag, Play, SkipForward } from "lucide-react";
import { lookupVideo, saveClip } from "@/app/admin/actions";
import { CATEGORIES, CATEGORY_LABELS, type Clip } from "@/lib/clip-schema";
import { formatLength, formatTime, parseTime, parseVideoId, startFromUrl } from "@/lib/youtube";
import { findDuplicates } from "@/lib/duplicates";
import { loadYouTubeApi, type YTPlayer } from "@/lib/yt-player";

const field =
  "h-12 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 text-ivory placeholder:text-mist/70 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-marigold";

type Existing = { id: string; title: string; videoId: string; start: number; end: number };

const DUP_REASON = { overlap: "same video, overlapping", near: "same video, within a minute", title: "same name, another video" } as const;

export function ClipEditor({ clip, existing = [] }: { clip?: Clip; existing?: Existing[] }) {
  const [state, action, pending] = useActionState(saveClip, undefined);
  const [link, setLink] = useState(clip ? `https://www.youtube.com/watch?v=${clip.videoId}` : "");
  const [start, setStart] = useState(clip ? formatTime(clip.start) : "");
  const [end, setEnd] = useState(clip ? formatTime(clip.end) : "");
  const [videoTitle, setVideoTitle] = useState(clip?.videoTitle ?? "");
  const [title, setTitle] = useState(clip?.title ?? "");
  const [ready, setReady] = useState(false);
  const videoId = parseVideoId(link);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);

  const s = parseTime(start);
  const e = parseTime(end);
  // Warn (never block) when this looks like a clip that is already there: same video overlapping or within a
  // minute, or the same name on another video.
  const dups =
    videoId && s !== null && e !== null && e > s
      ? findDuplicates({ videoId, start: s, end: e, title }, existing.filter((x) => x.id !== clip?.id))
      : [];
  const err = state?.fields ?? {};

  // One preview player per video ID.
  useEffect(() => {
    if (!videoId || !host.current) return;
    let cancelled = false;
    const el = document.createElement("div");
    host.current.replaceChildren(el);
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { start: parseTime(start) ?? 0, playsinline: 1, rel: 0, origin: window.location.origin },
        events: { onReady: () => setReady(true) },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      setReady(false);
    };
    // Re-create only when the video changes, not on every time edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // The video's own title, for context on the board ("Day 5 · Dhuri 2026").
  useEffect(() => {
    if (!videoId || (clip && clip.videoId === videoId)) return;
    let live = true;
    lookupVideo(videoId).then((r) => live && setVideoTitle(r.title));
    return () => {
      live = false;
    };
  }, [videoId, clip]);

  function onLink(v: string) {
    setLink(v);
    const t = startFromUrl(v);
    if (t !== null && !start) setStart(formatTime(t));
  }

  const now = () => Math.floor(player.current?.getCurrentTime() ?? 0);
  const nudge = (which: "start" | "end", by: number) => {
    const cur = parseTime(which === "start" ? start : end) ?? 0;
    const v = formatTime(Math.max(0, cur + by));
    if (which === "start") setStart(v);
    else setEnd(v);
  };
  const preview = (from: number | null) => {
    if (!player.current || !videoId || s === null) return;
    player.current.loadVideoById({
      videoId,
      startSeconds: from ?? s,
      ...(e !== null && e > (from ?? s) ? { endSeconds: e } : {}),
    });
  };

  return (
    <form action={action} className="flex flex-col gap-block pb-8">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="grid size-10 place-items-center rounded-full text-sandal hover:bg-shyam-lit" aria-label="Back to clips">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="font-serif text-[2rem] text-ivory">{clip ? "Edit clip" : "Add a clip"}</h1>
      </div>

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* preview */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-[8px] border-[5px] border-brass bg-black">
            <div ref={host} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
            {!videoId && (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-mist">
                Paste a YouTube link and the video appears here. Play it, then mark where the bhajan starts and ends.
              </p>
            )}
          </div>
          {videoTitle && <p className="text-[0.95rem] text-sandal">From: {videoTitle}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!ready} onClick={() => setStart(formatTime(now()))} className="btn-mark">
              <Flag className="size-[18px]" aria-hidden="true" /> Mark start here
            </button>
            <button type="button" disabled={!ready} onClick={() => setEnd(formatTime(now()))} className="btn-mark">
              <Flag className="size-[18px]" aria-hidden="true" /> Mark end here
            </button>
            <button type="button" disabled={!ready || s === null} onClick={() => preview(null)} className="btn-ghost">
              <Play className="size-[18px]" aria-hidden="true" /> Preview the clip
            </button>
            <button
              type="button"
              disabled={!ready || e === null}
              onClick={() => preview(Math.max(0, (e ?? 0) - 6))}
              className="btn-ghost"
            >
              <SkipForward className="size-[18px]" aria-hidden="true" /> Hear the ending
            </button>
          </div>
        </div>

        {/* details */}
        <div className="flex flex-col gap-5">
          {clip && <input type="hidden" name="id" value={clip.id} />}
          <input type="hidden" name="videoTitle" value={videoTitle} />

          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-sandal">YouTube link</span>
            <input
              name="link"
              value={link}
              onChange={(ev) => onLink(ev.target.value)}
              placeholder="https://www.youtube.com/live/…"
              inputMode="url"
              required
              aria-invalid={Boolean(err.link || err.videoId)}
              className={field}
            />
            {(err.link || err.videoId) && <span className="text-[0.9rem] text-marigold">{err.link ?? err.videoId}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-sandal">Name</span>
            <input
              name="title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder="Radhe Radhe Japo Chale Aayenge Bihari"
              required
              maxLength={140}
              aria-invalid={Boolean(err.title)}
              className={`${field} font-serif text-[1.1rem]`}
            />
            {err.title && <span className="text-[0.9rem] text-marigold">{err.title}</span>}
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 font-semibold text-sandal">Section</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="category" value={c} defaultChecked={(clip?.category ?? "bhajan") === c} className="peer sr-only" />
                  <span className="flex h-11 items-center rounded-full border border-gold/40 px-5 font-semibold text-sandal peer-checked:border-gold peer-checked:bg-gold peer-checked:text-shyam peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-marigold">
                    {CATEGORY_LABELS[c].en}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            {(["start", "end"] as const).map((which) => (
              <div key={which} className="flex flex-col gap-1.5">
                <label htmlFor={which} className="font-semibold text-sandal">
                  {which === "start" ? "Starts at" : "Ends at"}
                </label>
                <input
                  id={which}
                  name={which}
                  value={which === "start" ? start : end}
                  onChange={(ev) => (which === "start" ? setStart : setEnd)(ev.target.value)}
                  placeholder={which === "start" ? "21:31" : "30:45"}
                  inputMode="numeric"
                  required
                  aria-invalid={Boolean(err[which])}
                  className={`${field} tabular text-[1.1rem]`}
                />
                <div className="flex gap-1">
                  {[-5, -1, 1, 5].map((by) => (
                    <button
                      key={by}
                      type="button"
                      onClick={() => nudge(which, by)}
                      className="h-9 flex-1 rounded-[6px] border border-gold/25 text-[0.9rem] text-sandal hover:border-gold hover:text-ivory"
                      aria-label={`${which} ${by > 0 ? "+" : "−"}${Math.abs(by)} seconds`}
                    >
                      {by > 0 ? "+" : "−"}
                      {Math.abs(by)}s
                    </button>
                  ))}
                </div>
                {err[which] && <span className="text-[0.9rem] text-marigold">{err[which]}</span>}
              </div>
            ))}
          </div>
          <p className="tabular text-[0.95rem] text-mist" aria-live="polite">
            {s !== null && e !== null && e > s
              ? `Clip length: ${formatLength(e - s)} (${formatTime(s)} – ${formatTime(e)})`
              : "Times look like 21:31 or 1:05:20."}
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-sandal">
              Tags <span className="font-normal text-mist">(optional, comma separated)</span>
            </span>
            <input name="tags" defaultValue={clip?.tags.join(", ")} placeholder="Radha, Holi" className={field} />
          </label>

          {dups.length > 0 && (
            <p role="status" className="rounded-[6px] border border-marigold/50 px-3 py-2 text-[0.95rem] text-sandal">
              Possibly already there:{" "}
              {dups.map((d) => `“${d.with.title}” (${DUP_REASON[d.reason]}, ${formatTime(d.with.start)} – ${formatTime(d.with.end)})`).join("; ")}. You can still save it.
            </p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-sandal">
              Lyrics <span className="font-normal text-mist">(optional, shown beside the player)</span>
            </span>
            <textarea
              name="lyrics"
              defaultValue={clip?.lyrics}
              rows={6}
              maxLength={8000}
              placeholder={"राधे राधे जपो चले आएंगे बिहारी\nराधे राधे जपो चले आएंगे बिहारी"}
              aria-invalid={Boolean(err.lyrics)}
              className="min-h-32 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 py-2.5 font-serif text-[1.1rem] leading-relaxed text-ivory placeholder:text-mist/70 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-marigold"
            />
            {err.lyrics && <span className="text-[0.9rem] text-marigold">{err.lyrics}</span>}
          </label>

          <details className="rounded-[6px] border border-gold/25 px-3.5 py-2.5" open={Boolean(clip?.place || clip?.day)}>
            <summary className="cursor-pointer font-semibold text-sandal">Place and day (only if the video&apos;s title is read wrongly)</summary>
            <div className="mt-3 grid grid-cols-[1fr_6rem] gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.9rem] text-mist">Place</span>
                <input name="place" defaultValue={clip?.place} placeholder="Sikar, Rajasthan" maxLength={80} className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.9rem] text-mist">Day</span>
                <input name="day" defaultValue={clip?.day ?? ""} inputMode="numeric" placeholder="5" aria-invalid={Boolean(err.day)} className={`${field} tabular`} />
              </label>
            </div>
            {err.day && <span className="text-[0.9rem] text-marigold">{err.day}</span>}
            <p className="mt-2 text-[0.85rem] text-mist">Leave empty to use what the YouTube title says.</p>
          </details>

          {state?.error && (
            <p role="alert" className="text-marigold">
              {state.error}
            </p>
          )}
          <button
            disabled={pending}
            className="h-12 rounded-full bg-gold text-[1.05rem] font-semibold text-shyam transition-colors hover:bg-marigold disabled:opacity-60"
          >
            {pending ? "Saving…" : clip ? "Save changes" : "Save clip"}
          </button>
        </div>
      </div>
    </form>
  );
}
