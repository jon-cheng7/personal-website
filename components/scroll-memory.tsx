"use client";

// Remembers + restores a page's scroll position (sessionStorage).
// Fits: Home, after the Scene.

import { useLayoutEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { getLenisInstance } from "@/lib/lenis-store";

interface ScrollMemoryProps {
  id: string;
}

const STORAGE_PREFIX = "scroll-memory:";

/** id: storage key suffix. Restores before paint; saves on scroll (rAF-throttled). */
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
      }
      const y = saved === null ? NaN : Number(saved);
      if (Number.isFinite(y) && y > 0) {
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
      persist();
    };
  }, [key]);

  return null;
}
