import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Shravanam Kirtanam keeps about you, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[44rem] px-4 pb-10 pt-6 sm:px-6">
      <h1 className="font-serif text-[clamp(1.9rem,1.4rem+1.5vw,2.6rem)] leading-tight text-ivory">Privacy</h1>
      <p className="mt-2 text-sandal">
        Shravanam Kirtanam is a small, unofficial fan collection of bhajans from Pujya Shri Indresh Upadhyay Ji Maharaj&apos;s katha. It is run by one person for
        personal use and shared with friends. There are no ads and no tracking or analytics scripts.
      </p>

      <h2 className="mb-1 mt-8 font-serif text-[1.4rem] text-ivory">If you don&apos;t sign in</h2>
      <p className="text-sandal">
        Nothing is sent to us. Your likes, recently played bhajans and settings (such as repeat) are kept only in your own browser, on your own device.
      </p>

      <h2 className="mb-1 mt-8 font-serif text-[1.4rem] text-ivory">If you sign in</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-sandal">
        <li>
          <strong className="text-ivory">With Google:</strong> we receive your name, email address and profile picture from Google. We never see your Google password.
        </li>
        <li>
          <strong className="text-ivory">With email and password:</strong> we keep your name, email address and a scrambled (hashed) version of your password. We cannot read your
          password.
        </li>
        <li>We keep your likes, recently played bhajans, and the YouTube videos you add to My videos. Only you can see them.</li>
        <li>A sign-in cookie keeps you signed in on this device. It is used for nothing else.</li>
      </ul>

      <h2 className="mb-1 mt-8 font-serif text-[1.4rem] text-ivory">YouTube</h2>
      <p className="text-sandal">
        Videos play in YouTube&apos;s own player, so YouTube (Google) may set its own cookies and collect data under{" "}
        <a className="text-ivory underline decoration-gold/50 hover:decoration-gold" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google&apos;s privacy policy
        </a>
        . The site is hosted on Vercel and its data is stored on MongoDB Atlas.
      </p>

      <h2 className="mb-1 mt-8 font-serif text-[1.4rem] text-ivory">Removing your data</h2>
      <p className="text-sandal">
        Signed-in people can delete their account on the{" "}
        <Link href="/my" className="text-ivory underline decoration-gold/50 hover:decoration-gold">
          My videos
        </Link>{" "}
        page (&ldquo;Delete my account and data&rdquo;). That removes the account, likes, history and every video you added. Without an account, clear this site&apos;s data in
        your browser settings.
      </p>
    </main>
  );
}
