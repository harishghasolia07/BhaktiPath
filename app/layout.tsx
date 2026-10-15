import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Mukta, Tiro_Devanagari_Hindi, Yatra_One } from "next/font/google";
import { HeaderNav } from "@/components/HeaderNav";
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
    "Bhajans, kirtans and katha from Pujya Shri Indresh Upadhyay Ji Maharaj's Shrimad Bhagwat Katha, each playing just its own part.",
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
  return (
    <html lang="en" className={`${yatra.variable} ${tiro.variable} ${mukta.variable}`}>
      {/* Laptops and up: the site is exactly one screen tall; only lists scroll, inside themselves. */}
      <body className="flex min-h-svh flex-col antialiased lg:h-svh lg:overflow-hidden">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-shyam"
        >
          Skip to content
        </a>
        <header className="relative z-20 shrink-0">
          <Toran />
          <div className="mx-auto flex h-[62px] w-full max-w-[1520px] items-center px-4 sm:h-[62px] sm:px-6">
            <Link href="/" className="group flex shrink-0 items-center gap-2 no-underline sm:gap-3" aria-label="Shravanam Kirtanam, home">
              <Feather className="h-8 w-5 shrink-0 max-[339px]:hidden sm:h-9 sm:w-6 transition-transform duration-500 ease-out group-hover:-rotate-12" />
              <span className="flex items-baseline gap-3">
                <span lang="hi" className="whitespace-nowrap font-display text-[1.45rem] leading-none text-gold max-[359px]:text-[1.2rem] sm:text-[2rem]">
                  श्रवणं कीर्तनं
                </span>
                <span className="hidden text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-sandal sm:inline">
                  Shravanam Kirtanam
                </span>
              </span>
            </Link>
            <HeaderNav />
          </div>
        </header>

        {/* Laptops: the stage between header and footer is a size container; must-fit things
            (shrine, board) size against it, leaving a 2rem gap above the footer. */}
        <div id="content" className="flex-1 lg:min-h-0 lg:overflow-y-auto lg:[container-type:size] lg:[--fit-h:calc(100cqh-2.75rem)]">
          {children}
        </div>

        <footer className="mt-group shrink-0 border-t border-gold/20 lg:mt-0">
          <div className="mx-auto flex max-w-[1520px] flex-col gap-3 px-4 py-8 text-[0.95rem] text-sandal sm:px-6 md:flex-row md:items-end md:justify-between lg:items-center lg:gap-6 lg:py-3 lg:text-[0.9rem]">
            <p className="max-w-[60ch] xl:max-w-none">
              Katha by <strong className="font-semibold text-gold">Pujya Shri Indresh Upadhyay Ji Maharaj</strong>. Every
              video plays from the official{" "}
              <a
                className="text-ivory underline decoration-gold/50 hover:decoration-gold"
                href="https://www.youtube.com/@BhaktiPath"
                target="_blank"
                rel="noopener noreferrer"
              >
                BhaktiPath YouTube channel
              </a>
              . This is an unofficial fan collection.
            </p>
            <p lang="hi" className="shrink-0 font-serif text-[1.05rem] text-sandal/90">
              श्रवणं कीर्तनं विष्णोः स्मरणं पादसेवनम्
              <span lang="en" className="ml-2 text-sandal/70">
                Bhagavatam 7.5.23
              </span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
