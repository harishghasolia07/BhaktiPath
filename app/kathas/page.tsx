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
    <main data-shell className="mx-auto w-full max-w-[1520px] px-4 pt-4 sm:px-6 lg:pt-3 max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:pb-3 max-lg:pt-3">
      <KathaLibrary clips={clips} />
    </main>
  );
}
