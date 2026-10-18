import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { ClipCard } from "@/components/ClipCard";
import { AuthForms } from "@/components/my/AuthForms";
import { ResendVerification } from "@/components/my/ResendVerification";
import { SyncAccount } from "@/components/my/SyncAccount";
import { MyVideoForm } from "@/components/my/MyVideoForm";
import { getAccounts } from "@/lib/accounts";
import type { Clip } from "@/lib/clip-schema";
import { googleConfigured } from "@/lib/google";
import { mailAvailable } from "@/lib/mail";
import { currentUser } from "@/lib/user-session";

export const metadata: Metadata = { title: "My videos" };

const ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  state: "That sign-in took too long or was interrupted. Please try again.",
  google: "Google didn't confirm the sign-in. Please try again.",
  "not-configured": "Sign-in isn't set up on this site yet.",
  link: "That link has expired or isn't valid. If you need a new one, use “Send it again” below.",
};

const NOTE = {
  pending: ["Waiting for approval to be added to the Katha Sangraha", "text-marigold"],
  approved: ["Approved: it's now in the Katha Sangraha for everyone", "text-gold"],
  rejected: ["Not approved for the Katha Sangraha (still yours)", "text-mist"],
} as const;

function SubmissionNote({ status }: { status: Clip["submission"] }) {
  if (!status) return null;
  const [text, tone] = NOTE[status];
  return <p className={`mt-1.5 text-[0.85rem] font-semibold ${tone}`}>{text}</p>;
}

export default function MyPage(props: PageProps<"/my">) {
  return (
    <main className="mx-auto w-full max-w-[1520px] px-4 pb-10 pt-6 sm:px-6 lg:pb-0 lg:pt-4">
      <Suspense fallback={<p className="text-sandal">Loading…</p>}>
        <Body search={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ search }: { search: PageProps<"/my">["searchParams"] }) {
  const [user, sp] = await Promise.all([currentUser(), search]);
  const error = ERRORS[String(Array.isArray(sp.error) ? sp.error[0] : sp.error ?? "")];
  if (!user) {
    return (
      <div className="mx-auto flex max-w-[34rem] flex-col items-center gap-5 py-10 text-center">
        <h1 className="font-serif text-[clamp(1.9rem,1.4rem+1.5vw,2.6rem)] leading-tight text-ivory">My videos</h1>
        <p className="text-[1.05rem] text-sandal">
          Sign in to keep your own likes and recently played, and to add any YouTube video you love, then rename or trim it however you like. Only you can see them.
        </p>
        {error && (
          <p role="alert" className="text-marigold">
            {error}
          </p>
        )}
        {googleConfigured() && (
          <>
            <a href="/api/auth/google?to=/my" className="inline-flex h-12 items-center rounded-full bg-gold px-7 font-semibold text-shyam no-underline hover:bg-marigold">
              Continue with Google
            </a>
            <p className="flex w-full max-w-sm items-center gap-3 text-[0.9rem] text-mist before:h-px before:flex-1 before:bg-gold/25 after:h-px after:flex-1 after:bg-gold/25">
              or use your email
            </p>
          </>
        )}
        <AuthForms />
      </div>
    );
  }
  const videos = await getAccounts().listVideos(user.id);
  return (
    <div className="flex flex-col gap-10 lg:h-[calc(var(--fit-h)-1rem)] lg:gap-4">
      <SyncAccount />
      {sp.verified && <p role="status" className="rounded-[8px] border border-gold/40 px-4 py-3 text-ivory lg:shrink-0">Thank you, your email is confirmed.</p>}
      {error && <p role="alert" className="text-marigold lg:shrink-0">{error}</p>}
      {!user.verified && mailAvailable() && (
        <p role="status" className="rounded-[8px] border border-marigold/50 px-4 py-3 text-sandal lg:shrink-0">
          Please confirm your email: we sent a link to <strong className="text-ivory">{user.email}</strong>. <ResendVerification />
        </p>
      )}
      <div className="grid gap-10 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-8">
        <section aria-labelledby="mine" className="lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:shrink-0">
            <h1 id="mine" lang="en" className="min-w-0 font-serif text-[clamp(1.9rem,1.4rem+1.5vw,2.6rem)] leading-tight text-ivory">
              Radhe Radhe, {user.name.split(" ")[0]}
            </h1>
            <form action="/api/auth/logout" method="post">
              <button className="h-10 rounded-full border border-gold/50 px-5 font-semibold text-ivory transition-colors hover:border-gold hover:bg-shyam-lit">Sign out</button>
            </form>
          </div>
          <p className="mb-6 mt-1 text-sandal lg:mb-4 lg:shrink-0">{videos.length ? `${videos.length} ${videos.length === 1 ? "video" : "videos"} saved.` : "Nothing saved yet."}</p>
          <div className="lg:-mr-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2" data-may-scroll>
          {videos.length === 0 ? (
            <p className="rounded-[8px] border border-gold/25 p-5 text-sandal">Add your first YouTube video with the form, and it will appear here.</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] gap-x-5 gap-y-7 max-sm:grid-cols-1 max-sm:gap-y-4">
              {videos.map((v) => (
                <li key={v.id} className="relative min-w-0">
                  <ClipCard clip={v} lit={false} />
                  <SubmissionNote status={v.submission} />
                  <Link
                    href={`/my/${v.id}/edit`}
                    aria-label={`Edit ${v.title}`}
                    className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-velvet/85 text-ivory backdrop-blur-[2px] hover:bg-velvet max-sm:right-1.5 max-sm:top-1.5"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          </div>
        </section>
        <section aria-labelledby="add" className="h-fit rounded-[10px] border border-gold/30 bg-shyam/60 p-5 lg:max-h-full lg:overflow-y-auto lg:overscroll-contain lg:p-6" data-may-scroll>
          <h2 id="add" className="mb-4 font-serif text-[1.5rem] text-ivory">
            Add a YouTube video
          </h2>
          <MyVideoForm />
        </section>
      </div>
    </div>
  );
}
