import type { Metadata } from "next";
import { KathaLibrary } from "@/components/KathaLibrary";
import { getClips } from "@/lib/clips";

export const metadata: Metadata = {
  title: "Every katha",
  description: "Every bhajan, kirtan and katha clip, grouped by katha: place, year and day.",
};

export default async function KathasPage() {
  const clips = await getClips();
  return (
    <main className="mx-auto w-full max-w-[1520px] px-4 pt-4 sm:px-6 lg:pt-3">
      <KathaLibrary clips={clips} />
    </main>
  );
}
