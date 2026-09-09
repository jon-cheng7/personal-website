"use client";

import { useEffect, useState } from "react";

// How long the visitor has to sit with no scroll attempt before the cue
// nudges them — tune freely. Chosen so it doesn't flash on for someone who
// starts scrolling immediately, but doesn't take so long that a genuinely
// stuck visitor is left staring at nothing.
const IDLE_DELAY_MS = 2500;

/**
 * Hidden on load, fades in only once the visitor has sat idle (no scroll
 * attempt yet) for IDLE_DELAY_MS — a nudge for someone who seems stuck,
 * not an immediate "look here." Once they do scroll, it's gone for good —
 * `isVisible` requires both `isIdle` and `!hasScrolled`, so scrolling
 * before the timer fires means it never appears at all, and it doesn't
 * fade back in later either way.
 * A plain `window.scrollY` threshold for "have they scrolled" works for
 * both of the home page's two scroll modes (see horizontal-scroll.tsx):
 * the desktop pin-and-scrub mode still moves through normal vertical
 * scroll input under the hood (ScrollTrigger reads real scroll position,
 * only the *visual* motion is horizontal), so this needs no special
 * casing for which mode is active.
 */
export function ScrollCue() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 24) setHasScrolled(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const idleTimer = window.setTimeout(() => setIsIdle(true), IDLE_DELAY_MS);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idleTimer);
    };
  }, []);

  const isVisible = isIdle && !hasScrolled;

  return (
    <div
      className={`scroll-cue${isVisible ? " is-visible" : ""}`}
      aria-hidden="true"
    >
      <span className="scroll-cue__label">Scroll</span>
      <span className="scroll-cue__track">
        <span className="scroll-cue__thumb" />
      </span>
    </div>
  );
}
