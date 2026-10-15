"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", hi: "दर्शन समय", en: "Timings" },
  { href: "/kathas", hi: "कथा संग्रह", en: "Every katha" },
];

function Links({ path }: { path: string | null }) {
  return (
    <nav aria-label="Main" className="ml-auto flex items-center gap-0.5 sm:gap-2">
      {LINKS.map((l) => {
        const on = path !== null && (l.href === "/" ? path === "/" : path.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className="flex min-h-11 flex-col justify-center whitespace-nowrap rounded-full border border-transparent px-2.5 text-center max-[359px]:px-1.5 leading-tight no-underline transition-colors hover:border-gold/50 aria-[current=page]:border-gold/70 aria-[current=page]:bg-shyam/70 sm:px-4"
          >
            <span lang="hi" className="font-display text-[0.98rem] text-gold max-[359px]:text-[0.88rem] sm:text-[1.15rem]">
              {l.hi}
            </span>
            <span className="hidden text-[0.72rem] uppercase tracking-[0.14em] text-sandal sm:block">{l.en}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveLinks() {
  return <Links path={usePathname()} />;
}

/** The current page is URL data: the links render in the static shell, the highlight fills in. */
export function HeaderNav() {
  return (
    <Suspense fallback={<Links path={null} />}>
      <ActiveLinks />
    </Suspense>
  );
}
