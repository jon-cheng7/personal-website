"use client";

import { useRef } from "react";
import { ReactLenis } from "lenis/react";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@/lib/gsap";
import { setLenisInstance } from "@/lib/lenis-store";

/**
 * Mounts smooth (inertia-eased) scrolling globally, synced to GSAP's ticker
 * so ScrollTrigger and Lenis always agree on scroll position — without this
 * sync, pinned/scrubbed sections can jitter by a frame or two.
 *
 * Lenis automatically respects the OS-level prefers-reduced-motion setting
 * — when a visitor has that on, smoothing disables itself and scrolling
 * behaves natively. Individual scroll-triggered animations (see
 * scroll-reveal.tsx / pinned-scrub-example.tsx) still need their own
 * reduced-motion check for the *animation* itself; this only covers the
 * scroll-feel layer.
 */
export function SmoothScroll() {
  const lenisRef = useRef<{ lenis?: Lenis } | null>(null);

  useGSAP(() => {
    function update(time: number) {
      // GSAP's ticker reports time in seconds; Lenis expects milliseconds.
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    const lenis = lenisRef.current?.lenis;
    lenis?.on("scroll", ScrollTrigger.update);
    // Registered here so components outside this one (the nav drawer, for
    // instance) can call .stop()/.start() on the same instance — e.g. to
    // pause scrolling while a modal overlay is open.
    setLenisInstance(lenis ?? null);

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis?.off("scroll", ScrollTrigger.update);
      setLenisInstance(null);
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        lerp: 0.1,
        smoothWheel: true,
        // GSAP's ticker drives the raf loop instead (see above) — running
        // both would fight each other.
        autoRaf: false,
      }}
    />
  );
}
