import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogOut, Pencil, Plus } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { CATEGORY_LABELS } from "@/lib/clip-schema";
import { groupByVideo, langOf } from "@/lib/display";
import { isAdmin } from "@/lib/session";
import { getStore } from "@/lib/store";
import { formatTime } from "@/lib/youtube";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-[960px] px-4 pt-6 sm:px-6">
      <Suspense fallback={<p className="text-sandal">Loading…</p>}>
        <Admin searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Admin({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  if (!(await isAdmin())) {
    return (
      <div className="flex flex-col items-center gap-block py-8">
        <h1 className="font-serif text-[2rem] text-ivory">Sign in to add clips</h1>
        <LoginForm />
      </div>
    );
  }
  const sp = await searchParams;
  const store = getStore();
  const groups = groupByVideo(await store.list());

  return (
    <div className="flex flex-col gap-block">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[2rem] text-ivory">Clips</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-5 font-semibold text-shyam no-underline hover:bg-marigold"
          >
            <Plus className="size-[18px]" aria-hidden="true" /> Add a clip
          </Link>
          <Link
            href="/admin/bulk"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-gold/50 px-4 text-ivory no-underline hover:border-gold"
          >
            Add many
          </Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a file download, not a page */}
          <a
            href="/admin/backup"
            download
            className="inline-flex h-11 items-center gap-2 rounded-full border border-gold/50 px-4 text-ivory no-underline hover:border-gold"
          >
            Download backup
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a file download, not a page */}
          <a
            href="/admin/backup/accounts"
            download
            className="inline-flex h-11 items-center gap-2 rounded-full border border-gold/50 px-4 text-ivory no-underline hover:border-gold"
          >
            Accounts backup
          </a>
          <form action={logout}>
            <button className="inline-flex h-11 items-center gap-2 rounded-full border border-gold/40 px-4 text-sandal hover:border-gold hover:text-ivory">
              <LogOut className="size-[18px]" aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </div>

      {sp.saved && (
        <p role="status" className="rounded-[6px] border border-leaf/60 bg-leaf/20 px-4 py-3 text-ivory">
          Saved.{" "}
          <Link className="text-gold underline" href={`/clip/${sp.saved}`}>
            Open it
          </Link>
        </p>
      )}
      {sp.bulk && (
        <p role="status" className="rounded-[6px] border border-leaf/60 bg-leaf/20 px-4 py-3 text-ivory">
          Saved {sp.bulk} clips.
        </p>
      )}
      {sp.deleted && (
        <p role="status" className="rounded-[6px] border border-gold/40 px-4 py-3 text-ivory">
          Clip deleted.
        </p>
      )}
      {store.kind === "file" && (
        <p className="rounded-[6px] border border-marigold/50 px-4 py-3 text-[0.95rem] text-sandal">
          No database connected (MONGODB_URI isn&apos;t set). Changes are saved to a local file on this computer only.
        </p>
      )}

      {groups.length === 0 && <p className="text-sandal">No clips yet. Add the first one.</p>}
      {groups.map((g) => (
        <section key={g.videoId} className="flex flex-col gap-2">
          <h2 className="text-[0.85rem] font-semibold uppercase tracking-[0.16em] text-gold">{g.label}</h2>
          <ul className="divide-y divide-gold/15 rounded-[6px] border border-gold/25 bg-shyam/70">
            {g.clips.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 sm:flex-nowrap">
                <span className="tabular w-[9.5rem] shrink-0 text-[0.95rem] text-gold">
                  {formatTime(c.start)} – {formatTime(c.end)}
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={`/clip/${c.slug}`} lang={langOf(c.title)} className="font-serif text-[1.1rem] text-ivory no-underline hover:text-marigold">
                    {c.title}
                  </Link>
                  <span className="ml-2 text-[0.8rem] uppercase tracking-[0.1em] text-mist">
                    {CATEGORY_LABELS[c.category].en}
                    {c.sample ? " · sample" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Link
                    href={`/admin/${c.id}`}
                    aria-label={`Edit ${c.title}`}
                    className="grid size-10 place-items-center rounded-full text-sandal hover:bg-shyam-lit hover:text-ivory"
                  >
                    <Pencil className="size-[18px]" aria-hidden="true" />
                  </Link>
                  <DeleteButton id={c.id} title={c.title} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
