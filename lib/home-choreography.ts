import { vh } from "@/lib/scroll-bound";

// ---------------------------------------------------------------------------
// Scroll choreography for the Home page, in one place, so beats that are
// meant to line up with each other (e.g. the about card arriving just as the
// about bubble leaves) are defined relative to each other instead of as
// independent magic numbers in different files.
//
// ---------------------------------------------------------------------------

/** The hero portrait (sorrento.png), via its <ScrollMotion> wrapper in
 * components/hero.tsx. Same shape as any ScrollMotion config:
 *   parallax → speed before / after the lock (anchor 0 = it starts at its
 *              normal resting spot when the page loads)
 *   lock     → held still on screen; add x / y / align to choose where
 *              (omit = wherever it has drifted to by lock.start)
 *   exit     → frosts out like before (look = opacity 0 + 30px blur) */
export const HERO_PORTRAIT = {
  parallax: { in: 0.4, out: 0.4, anchor: 0 },
  // ease against the scroll, in seconds: start = how sluggishly it picks
  // up when scrolling starts (smaller = snappier), stop = how long it glides
  // after scrolling stops. A single number = same both ways; 0 = glued.
  smoothing: { start: 0.6, stop: 2.5 },
  lock: { start: vh(0.6), end: vh(3.1), x: "25vw", y: "50vh", align: "center" },
  exit: { start: vh(3.2), end: vh(3.9), look: { opacity: 0, blur: 30 } },
} as const;

/* The "about me" speech bubble on the hero portrait */
export const ABOUT_BUBBLE = { fromVh: 0.08, toVh: 1.8 } as const;

const ABOUT_BUBBLE_GONE = ABOUT_BUBBLE.fromVh;

export const ABOUT_CARD = {
  // Scroll moment at which the card sits dead-center on screen (its
  // <Place at=…> in app/page.tsx — also its parallax anchor): midway
  // between fully in and starting to leave.
  at: vh(1.7),
  enter: { start: vh(0.4), end: vh(0.8) },
  exit: { start: vh(2.8), end: vh(4) },
  // parallax % of normal page's scroll speed
  parallax: { factor: 0.5 },
} as const;

/** The big "about me" statement (<RevealText> in app/page.tsx). All in
 * viewport heights of scroll — tune freely:
 *   enter  → drifts/frosts in
 *   lock   → held dead-center on screen (its <Place at> is lock.start)
 *   reveal → words light up dim → lit (inside the lock)
 *   exit   → drifts/frosts out once released */
export const ABOUT_TEXT = {
  enter: { start: vh(0.35), end: vh(1.1), look: { opacity: 0, blur: 30 } },
  lock: { start: vh(1.3), end: vh(3.1), x: "50vw", y: "50vh", align: "left" },
  reveal: { start: vh(1.4), end: vh(2.9) },
  exit: { start: vh(3.2), end: vh(3.9), look: { opacity: 0, blur: 30 } },
  // fraction of the page's speed before / after the lock
  parallax: { in: 0.5, out: 0.5 },
  smoothing: { start: 0.6, stop: 2.5 },
} as const;


