import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Mukta, Tiro_Devanagari_Hindi, Yatra_One } from "next/font/google";
import { HeaderNav } from "@/components/HeaderNav";
import { PlayerProvider } from "@/components/PlayerProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { Feather, Toran } from "@/components/ornaments";
import "./site.css";
import "./cursor.css";

const yatra = Yatra_One({ weight: "400", subsets: ["devanagari", "latin"], variable: "--font-yatra" });
const tiro = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari", "latin"],
  variable: "--font-tiro",
});
const mukta = Mukta({ weight: ["400", "500", "600", "700"], subsets: ["devanagari", "latin"], variable: "--font-mukta" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Shravanam Kirtanam · श्रवणं कीर्तनं", template: "%s · Shravanam Kirtanam" },
  description:
    "Bhajans and katha from Pujya Shri Indresh Upadhyay Ji Maharaj's Shrimad Bhagwat Katha, each playing just its own part.",
  applicationName: "Shravanam Kirtanam",
  // YouTube's player needs the page address (error 153 without it).
  referrer: "strict-origin-when-cross-origin",
  robots: { index: false, follow: false },
  openGraph: { siteName: "Shravanam Kirtanam", type: "website", locale: "en_IN" },
};

export const viewport: Viewport = {
  themeColor: "#4b0915",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // A short, human-checkable version of the build the page was served from (the commit it was built
  // at). Printed in the footer: an installed PWA has no address bar, so this is how we can tell
  // whether the app in hand is running the current deployment or an older, cached one.
  const build = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
  return (
    <html lang="en" className={`${yatra.variable} ${tiro.variable} ${mukta.variable}`}>
      {/* Laptops and up: the site is exactly one screen tall; the page scrolls inside #content, and the
          header scrolls away with it — nothing sits over the page and hides what slides up under it. */}
      {/* Phones and tablets: Home and Katha Sangraha (marked data-shell) are exactly one screen tall and only
          their list scrolls; #content keeps its own scroll as a last resort on very small or landscape screens. */}
      <body className="flex min-h-svh flex-col antialiased max-lg:has-[[data-shell]]:h-dvh max-lg:has-[[data-shell]]:overflow-hidden lg:h-svh lg:overflow-hidden">
        <PlayerProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-shyam"
          >
            Skip to content
          </a>

          {/* Laptops: the stage between header and footer is a size container; must-fit things
              (shrine, board) size against it, leaving a 2rem gap above the footer. The header lives
              inside it (see below) so it travels with the page instead of sitting on top of it. */}
          <div id="content" className="flex-1 max-lg:has-[[data-shell]]:flex max-lg:has-[[data-shell]]:min-h-0 max-lg:has-[[data-shell]]:flex-col max-lg:has-[[data-shell]]:overflow-y-auto max-lg:has-[[data-shell]]:overscroll-contain lg:min-h-0 lg:overflow-y-auto lg:[container-type:size] lg:[--fit-h:calc(100cqh-var(--nav-h)-2rem)]">
            {/* The header is part of the page, not a bar above it: scrolling carries it away, so
                nothing is ever left covering the content that slides up. */}
            <header className="relative z-20 shrink-0">
              <Toran />
              <div className="mx-auto flex h-[62px] w-full max-w-[1520px] items-center px-4 sm:h-[62px] sm:px-6">
                <Link href="/" className="group flex shrink-0 items-center gap-2 no-underline sm:gap-3" aria-label="Shravanam Kirtanam, home">
                  <Feather className="h-8 w-5 shrink-0 max-[339px]:hidden sm:h-9 sm:w-6 transition-transform duration-500 ease-out group-hover:-rotate-12" />
                  <span className="flex items-baseline gap-3">
                    <span lang="hi" className="whitespace-nowrap font-display text-[1.45rem] leading-none text-gold max-[399px]:text-[1.25rem] max-[359px]:text-[1.15rem] sm:text-[2rem]">
                      श्रवणं कीर्तनं
                    </span>
                    <span className="hidden text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-sandal lg:inline">
                      Shravanam Kirtanam
                    </span>
                  </span>
                </Link>
                <HeaderNav />
              </div>
            </header>

            {children}
            {/* The player is drawn inside this box: the page's scroll clips it and carries it exactly
                like the shrine it sits over. (At the end of <body> nothing clipped it, so on wide
                screens the video slid up over the header while the shrine was cut off below.)
                `relative` makes it the player's containing block — inside the scroll area, so the
                scroll clips the player too. */}
            <div id="player-mount" className="relative" />
          </div>

          <SiteFooter build={build} />
        </PlayerProvider>
      </body>
    </html>
  );
}
