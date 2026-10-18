import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/my/ForgotForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <main className="mx-auto flex w-full max-w-[34rem] flex-col items-center gap-5 px-4 py-10 text-center sm:px-6">
      <h1 className="font-serif text-[clamp(1.9rem,1.4rem+1.5vw,2.6rem)] leading-tight text-ivory">Forgot your password?</h1>
      <p className="text-sandal">Enter your email and we&apos;ll send you a link to choose a new one. If you signed up with Google, just use “Continue with Google”.</p>
      <ForgotForm />
      <Link href="/my" className="text-sandal underline decoration-gold/40 hover:text-ivory hover:decoration-gold">
        Back to sign in
      </Link>
    </main>
  );
}
