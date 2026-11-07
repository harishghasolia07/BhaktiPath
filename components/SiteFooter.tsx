"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * The credit line under the page. On phones it is fixed to the bottom and slides in only while the page is
 * being scrolled (then hides again), so it doesn't take a strip of the screen away all the time. Laptops
 * keep it in the layout as before.
 */
export function SiteFooter() {
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    setShown(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 1400);
  }, []);

  const stay = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setShown(true);
  }, []);

  useEffect(() => {
    // Capture: on phones the page may scroll inside #content rather than the window.
    // The lyrics panel scrolls itself on every new line; that must not flash the footer.
    const onScroll = (e: Event) => {
      const t = e.target;
      if (t instanceof Element && t.closest("[data-footer-quiet]")) return;
      show();
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      if (timer.current) clearTimeout(timer.current);
    };
  }, [show]);

  return (
    <footer
      onFocusCapture={stay}
      onPointerEnter={stay}
      onPointerLeave={show}
      className={`mt-group shrink-0 border-t border-gold/20 lg:mt-0 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:bg-velvet-deep max-lg:pb-[env(safe-area-inset-bottom)] max-lg:shadow-[0_-14px_30px_-12px_rgb(0_0_0/0.65)] max-lg:transition-transform max-lg:duration-300 max-lg:ease-out motion-reduce:transition-none max-lg:[body:has([data-shell]):has([data-mini])_&]:hidden ${
        shown ? "max-lg:translate-y-0" : "max-lg:pointer-events-none max-lg:translate-y-full"
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
