import type { CursorBlendMode, CursorShape } from "./types";

// ---- utility ----
export function withBlend(shape: CursorShape, blend: CursorBlendMode): CursorShape {
  return { ...shape, blend };
}

// ---- base geometries

// The plain resting-state pointer dot
export const DOT: CursorShape = { kind: "simple", width: 14, height: 14, radius: "50%" };

// The hollow hover ring
export const RING: CursorShape = { kind: "simple", width: 34, height: 34, radius: "50%" };

// The rounded-rect media-preview panel
export const PREVIEW: CursorShape = { kind: "simple", width: 160, height: 110, radius: 12 };

// Rotating star
export const STAR: CursorShape = {
  kind: "svg",
  viewBox: "0 0 100 100",
  width: 48,
  height: 48,
  path: `
    M50 5
    L61 36
    L95 36
    L68 56
    L78 90
    L50 70
    L22 90
    L32 56
    L5 36
    L39 36
    Z
  `,
};

/** The one "svg"-kind base geometry in the built-in set — see modes.ts's
 * own comment on why "arrow" exists (to exercise the MorphSVGPlugin path
 * regardless of which other shape it's transitioning against). */
export const ARROW: CursorShape = {
  kind: "svg",
  viewBox: "0 0 100 100",
  width: 48,
  height: 48,
  path: "M50 8 L88 46 L64 46 L64 92 L36 92 L36 46 L12 46 Z",
};

/**
 * A rounded, downward-pointing arrow (shaft + chevron head) — the "enter"
 * mode's shape (see modes.ts), for a single specific target that should
 * read as "go into this" rather than the generic hollow "link" ring.
 * Always points down: nothing in this system ever rotates an "svg"-kind
 * shape's path (only a "simple" shape's `rotate` does that, and this isn't
 * one), so the silhouette below is the whole story regardless of mode
 * transitions or the idle bob (`idleMotion` in modes.ts) applied on top of
 * it — that only ever translates the shape vertically, never rotates it.
 *
 * The coordinates are a hand-rescale of the original 94x101 export into
 * this module's shared "0 0 100 100" morph space — every other "svg" mode
 * in modes.ts is authored against that same box (see types.ts's comment on
 * why: it's what lets MorphSVGPlugin morph cleanly against any other shape
 * without the SVG's own `viewBox` attribute visibly jumping the instant a
 * transition starts). Uniform scale + centering — the same technique
 * lib/cursor/morph-strategy.ts's `rectToPath` already uses to inscribe a
 * "simple" shape into this same box — applied once by hand here since the
 * source was already a path rather than a rect.
 */
export const ENTER_ARROW: CursorShape = {
  kind: "svg",
  viewBox: "0 0 100 100",
  width: 48,
  height: 48,
  path: "M56.2143 6.3067C56.2143 2.8236 53.3906 0 49.9075 0C46.4245 0 43.6009 2.8236 43.6009 6.3067L49.9075 6.3067L56.2143 6.3067ZM45.448 97.8949C47.911 100.3574 51.9042 100.3574 54.367 97.8949L94.5026 57.7594C96.9654 55.2964 96.9654 51.3033 94.5026 48.8404C92.0396 46.3774 88.0464 46.3774 85.5836 48.8404L49.9075 84.5164L14.2315 48.8404C11.7686 46.3774 7.7754 46.3774 5.3125 48.8404C2.8496 51.3033 2.8496 55.2964 5.3125 57.7594L45.448 97.8949ZM49.9075 6.3067L43.6009 6.3067L43.6009 93.4354L49.9075 93.4354L56.2143 93.4354L56.2143 6.3067L49.9075 6.3067Z",
};

// ---- named visual variants actually referenced by lib/cursor/modes.ts ----
// Each pair below shares its geometry with the base constant above by
// reference (via `withBlend`'s shallow copy) — there is exactly one place
// in source that spells out each shape's actual geometry, no matter how
// many blend variants of it exist.

export const DOT_DIFFERENCE = withBlend(DOT, "difference");
export const RING_DIFFERENCE = withBlend(RING, "difference");
export const PREVIEW_DIFFERENCE = withBlend(PREVIEW, "difference");
export const ARROW_DIFFERENCE = withBlend(ARROW, "difference");
export const ENTER_ARROW_DIFFERENCE = withBlend(ENTER_ARROW, "difference");

