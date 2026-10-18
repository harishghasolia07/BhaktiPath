import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetForm } from "@/components/my/ResetForm";
import { getAccounts } from "@/lib/accounts";
import { fingerprint, readToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPage(props: PageProps<"/my/reset">) {
  return (
    <main className="mx-auto flex w-full max-w-[34rem] flex-col items-center gap-5 px-4 py-10 text-center sm:px-6">
      <h1 className="font-serif text-[clamp(1.9rem,1.4rem+1.5vw,2.6rem)] leading-tight text-ivory">Choose a new password</h1>
      <Suspense fallback={<p className="text-sandal">Checking your link…</p>}>
        <Body search={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ search }: { search: PageProps<"/my/reset">["searchParams"] }) {
  const sp = await search;
  const token = String(Array.isArray(sp.token) ? sp.token[0] : sp.token ?? "");
  const t = token ? await readToken(token, "reset") : null;
  const c = t ? await getAccounts().getCredentialsById(t.u) : null;
  if (!t || !c || t.f !== fingerprint(c.passwordHash))
    return (
      <>
        <p role="alert" className="text-marigold">This link has expired or was already used.</p>
        <Link href="/my/forgot" className="inline-flex h-12 items-center rounded-full bg-gold px-7 font-semibold text-shyam no-underline hover:bg-marigold">Ask for a new link</Link>
      </>
    );
  return <ResetForm token={token} />;
}
