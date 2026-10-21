import { vh } from "@/lib/scroll-bound";

// ---------------------------------------------------------------------------
// Scroll choreography for the Home page, in one place, so beats that are
// meant to line up with each other (e.g. the about card arriving just as the
// about bubble leaves) are defined relative to each other instead of as
// independent magic numbers in different files.
//
// Units: viewport heights of scroll (see lib/scroll-bound.ts). Plain data —
// safe to import from Server Components (app/page.tsx) and Client
// Components (components/hero.tsx) alike.
// ---------------------------------------------------------------------------

/** The "about me" speech bubble on the hero portrait (components/hero.tsx):
 * visible while fromVh ≤ scroll < toVh. */
export const ABOUT_BUBBLE = { fromVh: 0.08, toVh: 1.8 } as const;

const ABOUT_BUBBLE_GONE = ABOUT_BUBBLE.toVh;

/** The first <FrostPanel> — the about-me card in the first section after
 * the hero (app/page.tsx). Fully in just BEFORE the about bubble disappears,
 * so the bubble's "let me tell you about myself" hands straight over to it.
 * Exit timing mirrors the entrance (same 0.45vh length). Tune freely. */
export const ABOUT_CARD = {
  enter: { start: vh(ABOUT_BUBBLE_GONE - 0.5), end: vh(ABOUT_BUBBLE_GONE - 0.05) },
  exit: { start: vh(ABOUT_BUBBLE_GONE + 0.95), end: vh(ABOUT_BUBBLE_GONE + 1.4) },
  // Same feel as the portrait (PORTRAIT_PARALLAX_FACTOR): drifts at 40% of
  // the page's speed, settling dead-center on screen midway between
  // fully-in and starting to leave.
  parallax: { factor: 0.4, centerAtAnchor: true },
} as const;
