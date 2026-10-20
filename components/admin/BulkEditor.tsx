"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { saveBulk } from "@/app/admin/actions";
import { parseBulk } from "@/lib/bulk";
import { sectionsText } from "@/lib/clip-schema";
import { formatLength, formatTime } from "@/lib/youtube";

const EXAMPLE = `https://www.youtube.com/live/fH2lNOThsV0 | Radhe Radhe Japo | 21:31 | 30:45 | kirtan + bhajan
https://www.youtube.com/live/fH2lNOThsV0?t=2700 | Hare Krishna Mahamantra | 52:30 | kirtan`;

export function BulkEditor() {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(saveBulk, undefined);
  const rows = parseBulk(text);
  const good = rows.filter((r) => r.clip).length;
  const bad = rows.length - good;

  return (
    <form action={action} className="flex flex-col gap-block pb-8">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="grid size-10 place-items-center rounded-full text-sandal hover:bg-shyam-lit" aria-label="Back to clips">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="font-serif text-[2rem] text-ivory">Add many clips</h1>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-semibold text-sandal">One clip per line</span>
        <span className="text-[0.95rem] text-mist">
          <code className="font-sans text-sandal">link | name | start | end | section</code>. The section can be left out (kirtan), or name several, like <code className="font-sans text-sandal">kirtan + bhajan</code>; when the link has{" "}
          <code className="font-sans text-sandal">?t=</code>, start can be left out too: <code className="font-sans text-sandal">link | name | end | section</code>.
          Lines starting with # are ignored.
        </span>
        <textarea
          name="lines"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={EXAMPLE}
          className="w-full rounded-[6px] border border-gold/35 bg-shyam px-3.5 py-3 font-mono text-[0.95rem] leading-relaxed text-ivory placeholder:text-mist/75 focus:border-marigold focus:shadow-[0_0_0_1px_var(--color-marigold)] focus:outline-none focus-visible:outline-none"
        />
      </label>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-[6px] border border-gold/25 bg-shyam/70" data-may-scroll>
          <table className="w-full min-w-[34rem] text-left text-[0.95rem]">
            <caption className="sr-only">Preview of the pasted lines</caption>
            <thead className="text-[0.8rem] uppercase tracking-[0.1em] text-mist">
              <tr>
                <th scope="col" className="px-3 py-2">Line</th>
                <th scope="col" className="px-3 py-2">Name</th>
                <th scope="col" className="px-3 py-2">Time</th>
                <th scope="col" className="px-3 py-2">Section</th>
                <th scope="col" className="px-3 py-2">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15">
              {rows.map((r) => (
                <tr key={r.line}>
                  <td className="tabular px-3 py-2 text-mist">{r.line}</td>
                  <td className="px-3 py-2 font-serif text-ivory">{r.clip?.title ?? r.raw.slice(0, 40)}</td>
                  <td className="tabular px-3 py-2 text-gold">
                    {r.clip ? `${formatTime(r.clip.start)} – ${formatTime(r.clip.end)} (${formatLength(r.clip.end - r.clip.start)})` : ""}
                  </td>
                  <td className="px-3 py-2 text-sandal">{r.clip ? sectionsText(r.clip) : ""}</td>
                  <td className={`px-3 py-2 ${r.error ? "text-marigold" : "text-sandal"}`}>{r.error ?? "OK"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-marigold">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          disabled={pending || good === 0 || bad > 0}
          className="h-12 rounded-full bg-gold px-6 text-[1.05rem] font-semibold text-shyam transition-colors hover:bg-marigold disabled:opacity-50"
        >
          {pending ? "Saving…" : good ? `Save ${good} ${good === 1 ? "clip" : "clips"}` : "Save"}
        </button>
        {bad > 0 && <span className="text-[0.95rem] text-marigold">{bad} line(s) need fixing first.</span>}
      </div>
    </form>
  );
}
