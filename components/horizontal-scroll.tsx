"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import "./horizontal-scroll.css";

interface HorizontalScrollProps {
  /** Each direct child renders as one full-viewport panel. */
  children: ReactNode;
}

/**
 * On screens wider than 900px (matches the nav's own breakpoint), pins
 * this section and translates its children horizontally as the visitor
 * scrolls vertically — the classic "horizontal scroll gallery" pattern,
 * same scrub-linked approach as pinned-scrub-example.tsx. Below 900px it's
 * a plain vertical stack instead: native scrolling, no pin, no transform.
 *
 * Uses GSAP's matchMedia so this re-evaluates cleanly on resize (rotating
 * a tablet, or a desktop window crossing the breakpoint) — matchMedia
 * automatically tears down the pin/transform the moment the query stops
 * matching, so there's no separate cleanup branch to maintain by hand.
 *
 * prefers-reduced-motion is folded into the same query: horizontal
 * scroll-jacking only ever activates without it, so a reduced-motion
 * visitor always gets the plain vertical stack regardless of screen size.
 *
 * Known tradeoff, not fully solved here: horizontal-scroll-via-vertical-
 * scroll is inherently a bit disorienting for screen-reader/keyboard use,
 * since scroll position doesn't follow focus. Tab order still matches the
 * visual left-to-right sequence, which covers the basics — worth a closer
 * look once this holds real content instead of placeholders.
 */
export function HorizontalScroll({ children }: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
      () => {
        const track = trackRef.current;
        const section = sectionRef.current;
        if (!track || !section) return;

        const distance = () => track.scrollWidth - window.innerWidth;
        if (distance() <= 0) return;

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        });

        // Runs automatically when the query above stops matching (window
        // resized under 901px, or reduced-motion switched on mid-visit).
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      },
    );

    return () => mm.revert();
  }, []);

  return (
    // Fixed creative choice, independent of the theme system (see
    // app/globals.css's color-tokens comment) — this section's background
    // is always #000 (below, in horizontal-scroll.css), in both light and
    // dark theme. Tagged directly rather than relying on the ambient
    // `data-chrome-tone` app/layout.tsx puts on <html>, which follows theme
    // and would be wrong here whenever the theme itself is light — see
    // lib/chrome-tone.ts for how a more deeply-nested tag like this one
    // wins over that ambient default for its own area.
    <div ref={sectionRef} className="horizontal-scroll" data-chrome-tone="light-on-dark">
      <div ref={trackRef} className="horizontal-scroll__track">
        {children}
      </div>
    </div>
  );
}
