"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Reference implementation of the "pin + scrub" pattern used throughout
 * Apple product pages: a section locks in place while scroll progress
 * drives an animation, then releases once that progress completes.
 *
 * This is a DEMO, not real content — delete it once real sections exist,
 * or copy the shape into a real component:
 *   1. a container that gets pinned
 *   2. a scrub-linked ScrollTrigger timeline (scrub ties the animation
 *      directly to scroll position — no separate playback, no easing over
 *      time, just "how far through the pin are we")
 *   3. a prefers-reduced-motion escape hatch that skips the pin/scrub
 *      entirely and shows the resting state instead
 *
 * See it live at /scroll-demo.
 */
export function PinnedScrubExample() {
  const container = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!box.current || !container.current) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(box.current, { scale: 1, rotate: 0, opacity: 1 });
        return;
      }

      gsap
        .timeline({
          scrollTrigger: {
            trigger: container.current,
            start: "top top",
            end: "+=150%",
            scrub: 1,
            pin: true,
          },
        })
        .fromTo(
          box.current,
          { scale: 0.5, rotate: -8, opacity: 0.4 },
          { scale: 1.4, rotate: 0, opacity: 1, ease: "none" },
        );
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      aria-label="Scroll animation example"
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        ref={box}
        style={{
          width: "min(60vw, 320px)",
          aspectRatio: "1",
          border: "2px solid currentColor",
          borderRadius: "1rem",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <p>
          This box scales &amp; rotates as you scroll through this section —
          replace with real content once there&apos;s a design to build
          against.
        </p>
      </div>
    </section>
  );
}
