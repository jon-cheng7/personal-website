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

// ---- named visual variants actually referenced by lib/cursor/modes.ts ----
// Each pair below shares its geometry with the base constant above by
// reference (via `withBlend`'s shallow copy) — there is exactly one place
// in source that spells out each shape's actual geometry, no matter how
// many blend variants of it exist.

export const DOT_DIFFERENCE = withBlend(DOT, "difference");
export const RING_DIFFERENCE = withBlend(RING, "difference");
export const PREVIEW_DIFFERENCE = withBlend(PREVIEW, "difference");
export const ARROW_DIFFERENCE = withBlend(ARROW, "difference");

