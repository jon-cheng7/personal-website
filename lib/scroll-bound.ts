// ---------------------------------------------------------------------------
// A scroll position, in `window.scrollY` px, that can be written in units
// that feel the same on every screen. Pure helpers — no DOM until resolved —
// so values can live in shared config modules and be passed from Server
// Components to Client Components (the string/number forms are
// serialisable; the function form only works from client code).
//
// Desktop's horizontal pin is still driven by vertical scroll under the hood
// (components/horizontal-scroll.tsx scrubs 1 scroll px → 1 px of track), so
// the same numbers work for "how far along the horizontal page" too.
// ---------------------------------------------------------------------------

export type ScrollPoint =
  | number //            absolute px of scroll
  | `${number}vh` //     fraction of viewport height, e.g. "175vh"
  | `${number}vw` //     fraction of viewport width,  e.g. "50vw"
  | (() => number); //   computed (client code only)

export function resolveScrollPoint(point: ScrollPoint): number {
  if (typeof point === "number") return point;
  if (typeof point === "function") return point();
  const value = parseFloat(point);
  return point.endsWith("vh")
    ? (value / 100) * window.innerHeight
    : (value / 100) * window.innerWidth;
}

/** `vh(1.75)` → "175vh": 1.75 viewport heights of scroll. */
export const vh = (viewportHeights: number): ScrollPoint =>
  `${Math.round(viewportHeights * 10000) / 100}vh` as `${number}vh`;
