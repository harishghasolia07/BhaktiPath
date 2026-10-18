import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { ClipCard } from "@/components/ClipCard";
import { AuthForms } from "@/components/my/AuthForms";
import { ResendVerification } from "@/components/my/ResendVerification";
import { DeleteAccountButton } from "@/components/my/DeleteAccountButton";
import { SyncAccount } from "@/components/my/SyncAccount";
import { MyVideoForm } from "@/components/my/MyVideoForm";
import { getAccounts } from "@/lib/accounts";
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

export default function MyPage(props: PageProps<"/my">) {
  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-6 sm:px-6 lg:pb-0 lg:pt-4">
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
          <h1 id="mine" className="font-serif lg:shrink-0 text-[clamp(1.9rem,1.4rem+1.5vw,2.6rem)] leading-tight text-ivory">
            My videos
          </h1>
          <div className="mb-6 mt-1 text-sandal lg:mb-4 lg:shrink-0">
            Hello, {user.name.split(" ")[0]}. {videos.length ? `${videos.length} saved, private to you.` : "Nothing saved yet."}{" "}
            <form action="/api/auth/logout" method="post" className="inline">
              <button className="text-sandal underline decoration-gold/40 hover:text-ivory hover:decoration-gold">Sign out</button>
            </form>
          </div>
          <div className="lg:-mr-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2" data-may-scroll>
          {videos.length === 0 ? (
            <p className="rounded-[8px] border border-gold/25 p-5 text-sandal">Add your first YouTube video with the form, and it will appear here.</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] gap-x-5 gap-y-7 max-sm:grid-cols-1 max-sm:gap-y-4">
              {videos.map((v) => (
                <li key={v.id} className="relative min-w-0">
                  <ClipCard clip={v} lit={false} />
                  <Link
                    href={`/my/${v.id}/edit`}
                    aria-label={`Edit ${v.title}`}
                    className="absolute right-2 top-12 z-10 grid size-9 place-items-center rounded-full bg-velvet/85 text-ivory backdrop-blur-[2px] hover:bg-velvet max-sm:right-1.5 max-sm:top-12"
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
          <div className="mt-6 border-t border-gold/20 pt-4">
            <DeleteAccountButton />
          </div>
        </section>
      </div>
    </div>
  );
}
