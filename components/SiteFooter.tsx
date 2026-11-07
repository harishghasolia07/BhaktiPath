"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** How far from the top still counts as "at the top" (a finger wobble shouldn't hide it). */
const TOP = 12;

/**
 * The credit line under the page. On phones it is fixed to the bottom and shown while the page is at its top,
 * so it is there to read and click when the page opens; scrolling away hides it, returning to the top brings it
 * back. Laptops keep it in the layout as before.
 */
export function SiteFooter() {
  const [atTop, setAtTop] = useState(true);
  const [compact, setCompact] = useState(false);

  // inert/translated only on phones and tablets; laptops keep the footer in normal flow
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    // Capture: on phones the page may scroll inside #content or a list rather than the window.
    // The lyrics panel scrolls itself on every new line; that must never move the footer.
    const quiet = (t: EventTarget | null) => t instanceof Element && t.closest("[data-footer-quiet]");
    const scrolled = (t: EventTarget | null) => {
      if (t === document || t === window) return (document.scrollingElement?.scrollTop ?? window.scrollY) > TOP;
      return t instanceof Element ? t.scrollTop > TOP : false;
    };
    const onScroll = (e: Event) => {
      if (!quiet(e.target)) setAtTop(!scrolled(e.target));
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    // the browser may restore a page already scrolled down; check once the first frame is laid out
    const raf = requestAnimationFrame(() => {
      const doc = document.scrollingElement ?? document.documentElement;
      const content = document.getElementById("content");
      setAtTop(doc.scrollTop <= TOP && (!content || content.scrollTop <= TOP));
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  const hidden = compact && !atTop;

  return (
    <footer
      inert={hidden}
      className={`mt-group shrink-0 border-t border-gold/20 lg:mt-0 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:bg-velvet-deep max-lg:pb-[env(safe-area-inset-bottom)] max-lg:shadow-[0_-14px_30px_-12px_rgb(0_0_0/0.65)] max-lg:transition-transform max-lg:duration-300 max-lg:ease-out motion-reduce:transition-none max-lg:[body:has([data-shell]):has([data-mini])_&]:hidden ${
        hidden ? "max-lg:pointer-events-none max-lg:translate-y-full" : "max-lg:translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-[1520px] flex-col gap-1 px-4 py-2.5 text-[0.8rem] leading-snug text-sandal sm:gap-3 sm:px-6 sm:py-8 sm:text-[0.95rem] md:flex-row md:items-end md:justify-between lg:items-center lg:gap-6 lg:py-3 lg:text-[0.9rem]">
        <p className="sm:hidden">
          Katha by <strong className="font-semibold text-gold">Pujya Shri Indresh Upadhyay Ji Maharaj</strong>, from the{" "}
          <a className="text-ivory underline decoration-gold/50" href="https://www.youtube.com/@BhaktiPath" target="_blank" rel="noopener noreferrer">
            BhaktiPath channel
          </a>
          . Unofficial fan collection. <Link href="/privacy" className="underline decoration-gold/50">Privacy</Link>
        </p>
        <p className="max-w-[60ch] max-sm:hidden xl:max-w-none">
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
          . This is an unofficial fan collection.{" "}
          <Link href="/privacy" className="text-ivory underline decoration-gold/50 hover:decoration-gold">
            Privacy
          </Link>
        </p>
        <p lang="hi" className="shrink-0 font-serif text-[1.05rem] text-sandal/90 max-sm:hidden">
          श्रवणं कीर्तनं विष्णोः स्मरणं पादसेवनम्
          <span lang="en" className="ml-2 text-sandal/70">
            Bhagavatam 7.5.23
          </span>
        </p>
      </div>
    </footer>
  );
}
