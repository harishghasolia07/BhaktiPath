import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getAccounts } from "@/lib/accounts";
import { findDuplicates } from "@/lib/duplicates";
import { sectionsText } from "@/lib/clip-schema";
import { langOf } from "@/lib/display";
import { isAdmin } from "@/lib/session";
import { getStore } from "@/lib/store";
import { formatLength, formatTime, thumbnailUrl, youtubeAtUrl } from "@/lib/youtube";
import { approveSubmission, rejectSubmission } from "../actions";

export const metadata: Metadata = { title: "Submissions" };

const DUP_REASON = { overlap: "same video, overlapping", near: "same video, within a minute", title: "same name, another video" } as const;

export default function SubmissionsPage(props: PageProps<"/admin/submissions">) {
  return (
    <main className="mx-auto w-full max-w-[960px] px-4 pb-10 pt-6 sm:px-6">
      <Suspense fallback={<p className="text-sandal">Loading…</p>}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/submissions">["searchParams"] }) {
  if (!(await isAdmin())) redirect("/admin");
  const sp = await searchParams;
  const [pending, clips] = await Promise.all([getAccounts().listPending(), getStore().list()]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="grid size-10 place-items-center rounded-full text-sandal hover:bg-shyam-lit" aria-label="Back to clips">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="font-serif text-[2rem] text-ivory">Submissions</h1>
      </div>
      {one(sp.approved) && (
        <p role="status" className="rounded-[8px] border border-gold/40 px-4 py-3 text-ivory">
          Added to the Katha Sangraha.{" "}
          <Link href={`/admin`} className="underline decoration-gold/50">
            Edit it in Clips
          </Link>{" "}
          to set the place or day.
        </p>
      )}
      {one(sp.rejected) && <p role="status" className="rounded-[8px] border border-gold/40 px-4 py-3 text-ivory">Declined. The person keeps their private copy.</p>}
      {one(sp.error) && <p role="alert" className="text-marigold">{one(sp.error)}</p>}
      {pending.length === 0 ? (
        <p className="rounded-[8px] border border-gold/25 p-5 text-sandal">Nothing is waiting for approval.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {pending.map(({ video: v, by }) => {
            const others = pending.filter((o) => o.video.id !== v.id).map((o) => ({ ...o.video, title: `${o.video.title} (also requested by ${o.by.name})` }));
            const overlaps = findDuplicates(v, [...clips, ...others]).map((d) => ({ ...d.with, why: DUP_REASON[d.reason] }));
            return (
              <li key={v.id} className="grid gap-4 rounded-[10px] border border-gold/30 bg-shyam/60 p-4 sm:grid-cols-[14rem_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnailUrl(v.videoId, "hq")} alt="" className="aspect-video w-full rounded-[8px] object-cover" />
                <div className="flex min-w-0 flex-col gap-2">
                  <h2 lang={langOf(v.title)} className="font-serif text-[1.35rem] leading-snug text-ivory">
                    {v.title}
                  </h2>
                  <p className="tabular text-sandal">
                    {sectionsText(v)} · {formatTime(v.start)} – {formatTime(v.end)} ({formatLength(v.end - v.start)})
                  </p>
                  <p className="text-[0.9rem] text-mist">
                    From {by.name}
                    {by.email ? ` (${by.email})` : ""}
                    {v.videoTitle ? ` · ${v.videoTitle}` : ""}
                  </p>
                  {v.lyrics && <p className="line-clamp-3 whitespace-pre-line font-serif text-[0.95rem] text-sandal">{v.lyrics}</p>}
                  {overlaps.length > 0 && (
                    <p role="status" className="rounded-[6px] border border-marigold/50 px-3 py-2 text-[0.9rem] text-sandal">
                      Possibly already there: {overlaps.map((c) => `“${c.title}” (${c.why}, ${formatTime(c.start)} – ${formatTime(c.end)})`).join("; ")}.
                    </p>
                  )}
                  <a href={youtubeAtUrl(v.videoId, v.start)} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 text-[0.95rem] text-sandal underline decoration-gold/40 hover:text-ivory">
                    Watch it on YouTube at {formatTime(v.start)}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <form action={approveSubmission}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="h-11 rounded-full bg-gold px-6 font-semibold text-shyam hover:bg-marigold">Approve and add</button>
                    </form>
                    <form action={rejectSubmission}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="h-11 rounded-full border border-gold/40 px-6 font-semibold text-sandal hover:border-gold hover:text-ivory">Decline</button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
