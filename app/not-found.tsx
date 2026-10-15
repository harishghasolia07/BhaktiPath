import Link from "next/link";
import { Diya } from "@/components/ornaments";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[40rem] flex-col items-center gap-head px-4 py-[var(--section-py)] text-center">
      <Diya lit={false} className="size-14" />
      <h1 className="font-serif text-[2rem] leading-tight text-ivory">This darshan isn&apos;t here</h1>
      <p className="text-sandal">
        The clip may have been renamed or removed. Every bhajan that is still here is on the timings board.
      </p>
      <Link
        href="/"
        className="rounded-full border border-gold/70 bg-shyam px-5 py-2.5 font-semibold text-ivory no-underline hover:border-gold"
      >
        Back to the board
      </Link>
    </main>
  );
}
