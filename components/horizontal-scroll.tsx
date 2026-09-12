"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import "./horizontal-scroll.css";

interface HorizontalScrollProps {
  /** Each direct child renders as one full-viewport panel. */
  children: ReactNode;
}

/** How much of the viewport's width a panel spends fading/blurring out as
 * it crosses the left edge — a fraction of `window.innerWidth` rather than
 * a fixed px value, so the effect reads the same regardless of viewport
 * size, same reasoning as hero.tsx's own "measure, don't guess" comment. */
const EXIT_FADE_FRACTION = 0.6;
/** Max blur applied once a panel has fully exited — tuned by feel, same
 * "name the constant, tune later" approach as hero.tsx's INTRO_START_SCALE. */
const EXIT_MAX_BLUR_PX = 14;

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
 * As an element's left edge crosses the viewport's left edge (i.e. it's
 * scrolling out from under the pin), it fades and blurs out — "as if going
 * behind a frosted glass pane" per the brief — rather than just sliding out
 * sharp and instant. Driven off the same scrub tween as the horizontal
 * translation itself (its own onUpdate, not ScrollTrigger's) so the fade is
 * exactly in step with what's on screen each frame, including the scrub's
 * own smoothing lag, rather than racing ahead of or behind it.
 *
 * Per-element, not per-panel: each panel (a direct child of the track) can
 * mark its own individually-fading pieces with a `data-scroll-fade`
 * attribute — see hero.tsx's word/circle spans for an example — and each
 * marked piece gets its own exit progress computed from its own bounding
 * rect, so pieces at different horizontal positions within the same panel
 * (e.g. "Jon", the circle, and "cheng") independently begin fading as they
 * individually near the edge, rather than the whole panel dissolving as one
 * flat block. A panel with no `data-scroll-fade` descendants just fades as
 * a whole instead — the fallback below — so content that hasn't been
 * broken into pieces yet (the placeholder sections) still gets the effect
 * for free rather than silently opting out of it.
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

        // Cached once rather than re-queried every frame in onUpdate below —
        // the set of panels (and their marked pieces) doesn't change over
        // this effect's lifetime.
        const panels = gsap.utils.toArray<HTMLElement>(track.children);
        // Per panel: its own `[data-scroll-fade]` descendants if it has any
        // (each one gets its own independent exit progress below), or just
        // the panel itself as a single unit if it doesn't — see this
        // function's own doc comment above for why the fallback matters.
        const fadeTargets: HTMLElement[] = panels.flatMap((panel) => {
          const marked = Array.from(
            panel.querySelectorAll<HTMLElement>("[data-scroll-fade]"),
          );
          return marked.length > 0 ? marked : [panel];
        });

        const applyExitFade = () => {
          const exitDistance = window.innerWidth * EXIT_FADE_FRACTION;
          for (const target of fadeTargets) {
            const { left } = target.getBoundingClientRect();
            // 0 while an element sits fully on/past the right of the
            // viewport edge (not yet exiting); ramps to 1 as its left edge
            // travels past 0 towards -exitDistance; clamped, so a fully-
            // exited element (scrolled well past) just holds at the faded/
            // blurred end state.
            const exitProgress = gsap.utils.clamp(0, 1, -left / exitDistance);
            gsap.set(target, {
              opacity: 1 - exitProgress,
              filter:
                exitProgress > 0
                  ? `blur(${(exitProgress * EXIT_MAX_BLUR_PX).toFixed(2)}px)`
                  : "none",
            });
          }
        };

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          onUpdate: applyExitFade,
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
        // resized under 901px, or reduced-motion switched on mid-visit) —
        // resets every panel back to its plain, fully-visible state so the
        // vertical-stack fallback never inherits a stuck fade/blur from
        // whatever scroll position the horizontal mode was left at.
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(fadeTargets, { clearProps: "opacity,filter" });
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
