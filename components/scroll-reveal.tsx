"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

interface ScrollRevealProps {
  children: ReactNode;
  /** Vertical offset (px) the content starts from before revealing. */
  y?: number;
  /** Delay before the reveal starts, in seconds. */
  delay?: number;
  className?: string;
}

/**
 * Fades + slides content in once it scrolls into view. Plays once, like a
 * normal "reveal on scroll" — as opposed to the pin+scrub pattern in
 * pinned-scrub-example.tsx, which stays tied to scroll position the whole
 * way through.
 *
 * This one's a real reusable primitive, not just a demo — wrap any section
 * that should animate in as the visitor reaches it.
 *
 * Respects prefers-reduced-motion: content just appears, no motion.
 */
export function ScrollReveal({
  children,
  y = 40,
  delay = 0,
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(ref.current, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        ref.current,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: ref, dependencies: [y, delay] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
