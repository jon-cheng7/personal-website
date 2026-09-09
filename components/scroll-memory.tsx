"use client";

import { useLayoutEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { getLenisInstance } from "@/lib/lenis-store";

interface ScrollMemoryProps {
  /** Storage key suffix — unique per page that wants this. */
  id: string;
}

const STORAGE_PREFIX = "scroll-memory:";

/**
 * Remembers this page's scroll position across a visit to another route and
 * back, instead of every return landing back at the top. Session-only
 * (sessionStorage): survives client-side navigation and a manual reload in
 * the same tab, cleared when the tab closes — roughly the same lifetime as
 * the browser's own native scroll restoration, which Next's router
 * otherwise overrides on every navigation by scrolling new pages to the top.
 *
 * Render this as a sibling *after* the page's scroll-jacked content (see
 * app/page.tsx), not nested inside it. Restoring on mount uses
 * `useLayoutEffect` rather than `useEffect` for two reasons: it runs before
 * the browser paints the freshly-navigated-to page (no visible jump from 0
 * to the restored position), and — because React fires a commit's layout
 * effects bottom-up, completing one sibling's whole subtree before moving
 * to the next — a sibling rendered after HorizontalScroll is guaranteed to
 * have its effect run after HorizontalScroll's own (which sets up the
 * ScrollTrigger pin via useGSAP, also a layout effect). That matters
 * because restoring a deep scroll position only works once the page's real
 * scrollable height reflects the pinned section's pin-spacer, not before.
 *
 * The Home nav link (and the logo link) pass `scroll={false}` to Next's
 * `<Link>` so Next doesn't fight this with its own scroll-to-top on the
 * way in — see components/nav.tsx.
 */
export function ScrollMemory({ id }: ScrollMemoryProps) {
  const key = STORAGE_PREFIX + id;
  const hasRestored = useRef(false);

  useLayoutEffect(() => {
    if (!hasRestored.current) {
      hasRestored.current = true;
      let saved: string | null = null;
      try {
        saved = sessionStorage.getItem(key);
      } catch {
        // sessionStorage can throw in some private-browsing modes —
        // restoring is a nicety, not essential, so just skip it.
      }
      const y = saved === null ? NaN : Number(saved);
      if (Number.isFinite(y) && y > 0) {
        // Recalculates trigger start/end + pin-spacer sizes against the
        // freshly-mounted DOM before jumping — without this, restoring to
        // a deep position could exceed what ScrollTrigger thinks the
        // page's scrollable range is yet.
        ScrollTrigger.refresh();
        const lenis = getLenisInstance();
        if (lenis) {
          lenis.scrollTo(y, { immediate: true });
        } else {
          window.scrollTo(0, y);
        }
      }
    }

    let frame = 0;
    const persist = () => {
      try {
        sessionStorage.setItem(key, String(Math.round(window.scrollY)));
      } catch {
        // Non-essential — see above.
      }
    };
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        persist();
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) cancelAnimationFrame(frame);
      // Catches the position from just before navigating away, in case it
      // landed inside the rAF throttle above and never got flushed.
      persist();
    };
  }, [key]);

  return null;
}
