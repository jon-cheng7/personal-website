"use client";

// Lenis smooth scrolling, driven by the GSAP ticker.
// Fits: mounted once in layout; instance shared via lib/lenis-store.

import { useRef } from "react";
import { ReactLenis } from "lenis/react";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@/lib/gsap";
import { setLenisInstance } from "@/lib/lenis-store";

export function SmoothScroll() {
  const lenisRef = useRef<{ lenis?: Lenis } | null>(null);

  useGSAP(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    const lenis = lenisRef.current?.lenis;
    lenis?.on("scroll", ScrollTrigger.update);
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
        autoRaf: false,
      }}
    />
  );
}
