"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMyVideo, saveMyVideo } from "@/app/my/actions";
import { CATEGORIES, CATEGORY_LABELS, type Clip } from "@/lib/clip-schema";
import { formatTime } from "@/lib/youtube";

const field =
  "h-12 w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 text-ivory placeholder:text-mist/70 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-marigold";

/** Add a YouTube video to your own library, or edit one you added. Only the link is needed to add. */
export function MyVideoForm({ video }: { video?: Clip }) {
  const [state, action, pending] = useActionState(video ? saveMyVideo : addMyVideo, undefined);
  const router = useRouter();
  const err = state?.fields ?? {};
  const v = state?.values; // what was typed, kept after a warning or an error (adding only)
  // after adding: refresh the list behind the form (the form itself clears on its own)
  useEffect(() => {
    if (state?.added) router.refresh();
  }, [state, router]);
  return (
    <form action={action} className="flex flex-col gap-5">
      {video && <input type="hidden" name="id" value={video.id} />}
      {!video && (
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-sandal">YouTube link</span>
          <input name="link" inputMode="url" required defaultValue={v?.link} placeholder="https://www.youtube.com/watch?v=…" aria-invalid={Boolean(err.link)} className={field} />
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

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-semibold text-sandal">Section</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="category" value={c} defaultChecked={(video?.category ?? v?.category ?? "bhajan") === c} className="peer sr-only" />
              <span className="flex h-11 items-center rounded-full border border-gold/40 px-5 font-semibold text-sandal peer-checked:border-gold peer-checked:bg-gold peer-checked:text-shyam peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-marigold">
                {CATEGORY_LABELS[c].en}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        {(["start", "end"] as const).map((which) => (
          <label key={which} className="flex flex-col gap-1.5">
            <span className="font-semibold text-sandal">{which === "start" ? "Starts at" : "Ends at"}</span>
            <input
              name={which}
              defaultValue={video ? formatTime(video[which]) : v?.[which]}
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
      {!video && <p className="-mt-2 text-[0.9rem] text-mist">Leave both empty to add the whole video. Times look like 21:31 or 1:05:20.</p>}

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
