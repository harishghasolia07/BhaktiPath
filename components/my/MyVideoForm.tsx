"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMyVideo, saveMyVideo } from "@/app/my/actions";
import type { Category, Clip } from "@/lib/clip-schema";
import { SectionPicker } from "../SectionPicker";
import { formatTime, parseVideoId } from "@/lib/youtube";
import { loadYouTubeApi, type YTPlayer } from "@/lib/yt-player";

const field =
  "h-12 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 text-ivory placeholder:text-mist/70 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-marigold";

/**
 * Asks YouTube's player for a video's length in the browser, so adding the whole video needs only
 * the link. The player is hidden and only cues the video (it never plays). 0 until known.
 */
function useVideoLength(videoId: string | null) {
  const [found, setFound] = useState<{ id: string | null; length: number; reading: boolean }>({ id: null, length: 0, reading: false });
  // a different link: start over (before painting the old video's length)
  if (found.id !== videoId) setFound({ id: videoId, length: 0, reading: Boolean(videoId) });

  useEffect(() => {
    if (!videoId) return;
    let dead = false;
    let player: YTPlayer | null = null;
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none";
    document.body.appendChild(host);
    const startedAt = Date.now();
    const timers: { tick?: number; giveUp?: number } = {};
    const stop = () => {
      window.clearInterval(timers.tick);
      window.clearTimeout(timers.giveUp);
      if (!dead) setFound((f) => (f.id === videoId ? { ...f, reading: false } : f));
    };
    timers.giveUp = window.setTimeout(stop, 12500); // a player that never becomes ready
    const read = () => {
      let d = 0;
      try {
        d = Math.floor(player?.getDuration() ?? 0);
      } catch {
        d = 0;
      }
      if (d > 0) {
        setFound((f) => (f.id === videoId ? { id: videoId, length: d, reading: false } : f));
        stop();
      } else if (Date.now() - startedAt > 12000) {
        stop(); // live streams and blocked embeds have no length to read
      }
    };
    // wait for a typed link to settle before starting the player
    const arm = window.setTimeout(() => {
      if (dead) return;
      loadYouTubeApi()
        .then((YT) => {
          if (dead) return;
          player = new YT.Player(host, {
            videoId,
            playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
            events: { onReady: () => { timers.tick = window.setInterval(read, 500); read(); }, onError: stop },
          });
        })
        .catch(stop);
    }, 500);
    return () => {
      dead = true;
      window.clearTimeout(arm);
      window.clearTimeout(timers.giveUp);
      window.clearInterval(timers.tick);
      try {
        player?.destroy();
      } catch {
        // the iframe may already be gone
      }
      host.remove();
    };
  }, [videoId]);

  return { length: found.length, reading: found.reading };
}

/** Add a YouTube video to your own library, or edit one you added. Only the link is needed to add. */
export function MyVideoForm({ video }: { video?: Clip }) {
  const [state, action, pending] = useActionState(video ? saveMyVideo : addMyVideo, undefined);
  const router = useRouter();
  const err = state?.fields ?? {};
  const v = state?.values; // what was typed, kept after a warning or an error (adding only)
  // the fields stay uncontrolled (so the form clears after adding); these copies only watch them
  const [link, setLink] = useState(v?.link ?? "");
  const [startText, setStartText] = useState(v?.start ?? "");
  const [endText, setEndText] = useState(v?.end ?? "");
  const videoId = video ? null : parseVideoId(link);
  const wholeVideo = Boolean(videoId) && !startText.trim() && !endText.trim();
  const needsEnd = Boolean(videoId) && !endText.trim(); // the end is worked out from the length
  const { length, reading } = useVideoLength(needsEnd ? videoId : null);
  // after adding, the browser clears the fields; clear these copies too (before painting them)
  const [seenAdded, setSeenAdded] = useState<string | null>(null);
  if (state?.added && state.added.id !== seenAdded) {
    setSeenAdded(state.added.id);
    setLink("");
    setStartText("");
    setEndText("");
  }
  useEffect(() => {
    if (state?.added) router.refresh(); // show the new video in the list behind the form
  }, [state, router]);
  return (
    <form action={action} className="flex flex-col gap-5">
      {video && <input type="hidden" name="id" value={video.id} />}
      {!video && <input type="hidden" name="length" value={length || ""} />}
      {!video && (
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-sandal">YouTube link</span>
          <input
            name="link"
            inputMode="url"
            required
            defaultValue={v?.link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-invalid={Boolean(err.link)}
            className={field}
          />
          {err.link && <span className="text-[0.9rem] text-marigold">{err.link}</span>}
        </label>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold text-sandal">
          Name {!video && <span className="font-normal text-mist">(optional: we use the video&apos;s own title)</span>}
        </span>
        <input name="title" defaultValue={video?.title ?? v?.title} maxLength={140} required={Boolean(video)} aria-invalid={Boolean(err.title)} className={`${field} font-serif text-[1.1rem]`} />
        {err.title && <span className="text-[0.9rem] text-marigold">{err.title}</span>}
      </label>

      <SectionPicker
        value={video?.categories ?? (v?.categories ? (v.categories.split(",").filter(Boolean) as Category[]) : ["kirtan"])}
        error={err.categories}
      />

      <div className="grid grid-cols-2 gap-3">
        {(["start", "end"] as const).map((which) => (
          <label key={which} className="flex flex-col gap-1.5">
            <span className="font-semibold text-sandal">{which === "start" ? "Starts at" : "Ends at"}</span>
            <input
              name={which}
              defaultValue={video ? formatTime(video[which]) : v?.[which]}
              onChange={(e) => (which === "start" ? setStartText : setEndText)(e.target.value)}
              placeholder={video ? "" : which === "start" ? "0:00" : "End of video"}
              inputMode="numeric"
              required={Boolean(video)}
              aria-invalid={Boolean(err[which])}
              className={`${field} tabular text-[1.1rem]`}
            />
            {err[which] && <span className="text-[0.9rem] text-marigold">{err[which]}</span>}
          </label>
        ))}
      </div>
      {!video && (
        <p className="-mt-2 text-[0.9rem] text-mist">
          {wholeVideo && length > 0
            ? `Whole video · ${formatTime(length)}. Times look like 21:31 or 1:05:20.`
            : wholeVideo && reading
              ? "Reading the video’s length… Leave both empty to add the whole video."
              : "Leave both empty to add the whole video. Times look like 21:31 or 1:05:20."}
        </p>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-semibold text-sandal">Who can see it</legend>
        {video?.submission === "approved" ? (
          <p className="rounded-[6px] border border-gold/30 px-3.5 py-2.5 text-sandal">
            This video is in the Katha Sangraha for everyone. The public copy is looked after by the site owner, so changes you make here only change your own copy.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {(
              [
                ["private", "Private", "Only you can see it."],
                ["public", "Public", "Ask for it to be added to the Katha Sangraha. It appears there only after the site owner approves it."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex cursor-pointer items-start gap-3 rounded-[6px] border border-gold/30 px-3.5 py-2.5 has-[:checked]:border-gold has-[:checked]:bg-shyam-lit/60">
                <input type="radio" name="visibility" value={value} defaultChecked={(video ? (video.submission === "pending" ? "public" : "private") : (v?.visibility ?? "private")) === value} className="mt-1 size-4 accent-[var(--color-marigold)]" />
                <span>
                  <span className="block font-semibold text-ivory">{label}</span>
                  <span className="block text-[0.9rem] text-sandal">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {video?.submission === "rejected" && <p className="text-[0.9rem] text-mist">The site owner didn&apos;t add this one to the Katha Sangraha. You can change it and ask again by choosing Public.</p>}
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold text-sandal">
          Tags <span className="font-normal text-mist">(optional, comma separated)</span>
        </span>
        <input name="tags" defaultValue={video?.tags.join(", ") ?? v?.tags} className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold text-sandal">
          Lyrics or notes <span className="font-normal text-mist">(optional)</span>
        </span>
        <textarea
          name="lyrics"
          defaultValue={video?.lyrics ?? v?.lyrics}
          rows={5}
          maxLength={8000}
          className="min-h-28 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 py-2.5 font-serif text-[1.1rem] leading-relaxed text-ivory focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none"
        />
      </label>

      {state?.added && (
        <p role="status" className="rounded-[8px] border border-gold/40 px-3.5 py-2.5 text-ivory">
          <span aria-hidden="true">✓ </span>Added “{state.added.title}”.{" "}
          <Link href={`/my/${state.added.id}`} className="underline decoration-gold/50 hover:decoration-gold">
            Open it
          </Link>
        </p>
      )}
      {state?.duplicate && (
        <div role="alert" className="flex flex-col gap-3 rounded-[8px] border border-marigold/60 px-3.5 py-3 text-sandal">
          <p>
            <strong className="text-ivory">This looks like a video you already have.</strong> It&apos;s {state.duplicate.why} as “{state.duplicate.title}”{" "}
            {state.duplicate.where === "yours" ? "in your videos" : "in the Katha Sangraha"}.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={state.duplicate.href} className="inline-flex h-10 items-center rounded-full border border-gold/50 px-4 text-ivory no-underline hover:border-gold">
              Open the existing one
            </Link>
            <button name="confirm" value="1" disabled={pending} className="h-10 rounded-full bg-gold px-5 font-semibold text-shyam hover:bg-marigold disabled:opacity-60">
              Add anyway
            </button>
          </div>
        </div>
      )}
      {state?.error && (
        <p role="alert" className="text-[0.95rem] text-marigold">
          {state.error}
          {err.form && ` ${err.form}`}
        </p>
      )}
      <button disabled={pending} className="h-12 w-fit rounded-full bg-gold px-8 font-semibold text-shyam transition-opacity hover:bg-marigold disabled:opacity-60">
        {pending ? "Saving…" : video ? "Save changes" : "Add to my videos"}
      </button>
    </form>
  );
}
