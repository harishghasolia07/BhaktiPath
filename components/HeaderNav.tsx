"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { useAccount } from "@/lib/account-client";

const LINKS = [
  { href: "/", hi: "दर्शन समय", en: "Timings" },
  { href: "/kathas", hi: "कथा संग्रह", en: "Every katha" },
];

/** Sign in, or (signed in) your own videos. Shown once we know which, so it never flashes the wrong one. */
function AccountLink({ path }: { path: string | null }) {
  const acct = useAccount();
  if (acct.status === "loading") return <span className="size-11" aria-hidden="true" />;
  const on = path !== null && path.startsWith("/my");
  const name = acct.user?.name.split(" ")[0];
  return (
    <Link
      href="/my"
      aria-current={on ? "page" : undefined}
      aria-label={acct.user ? `My videos, signed in as ${acct.user.name}` : "Sign in"}
      className="ml-0.5 flex min-h-11 items-center gap-2 rounded-full border border-transparent px-2 text-gold no-underline transition-colors hover:border-gold/50 aria-[current=page]:border-gold/70 aria-[current=page]:bg-shyam/70 sm:px-3"
    >
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/50 bg-shyam">
        {acct.user?.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={acct.user.picture} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : acct.user ? (
          <span className="font-semibold">{name?.[0]?.toUpperCase()}</span>
        ) : (
          <UserRound className="size-[18px]" aria-hidden="true" />
        )}
      </span>
      <span className="hidden text-[0.95rem] font-semibold md:inline">{acct.user ? "My videos" : "Sign in"}</span>
    </Link>
  );
}

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
      <AccountLink path={path} />
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
