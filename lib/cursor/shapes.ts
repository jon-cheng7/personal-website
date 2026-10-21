// Cursor shape geometry presets + blend variants.
// Fits: referenced by modes.ts.

import type { CursorBlendMode, CursorShape } from "./types";

/** Same shape, different blend (e.g. difference). */
export function withBlend(shape: CursorShape, blend: CursorBlendMode): CursorShape {
  return { ...shape, blend };
}

export const DOT: CursorShape = { kind: "simple", width: 14, height: 14, radius: "50%" };

export const RING: CursorShape = { kind: "simple", width: 34, height: 34, radius: "50%" };

export const PREVIEW: CursorShape = { kind: "simple", width: 160, height: 110, radius: 12 };

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

export const ARROW: CursorShape = {
  kind: "svg",
  viewBox: "0 0 100 100",
  width: 48,
  height: 48,
  path: "M50 8 L88 46 L64 46 L64 92 L36 92 L36 46 L12 46 Z",
};

export const ENTER_ARROW: CursorShape = {
  kind: "svg",
  viewBox: "0 0 100 100",
  width: 48,
  height: 48,
  path: "M56.2143 6.3067C56.2143 2.8236 53.3906 0 49.9075 0C46.4245 0 43.6009 2.8236 43.6009 6.3067L49.9075 6.3067L56.2143 6.3067ZM45.448 97.8949C47.911 100.3574 51.9042 100.3574 54.367 97.8949L94.5026 57.7594C96.9654 55.2964 96.9654 51.3033 94.5026 48.8404C92.0396 46.3774 88.0464 46.3774 85.5836 48.8404L49.9075 84.5164L14.2315 48.8404C11.7686 46.3774 7.7754 46.3774 5.3125 48.8404C2.8496 51.3033 2.8496 55.2964 5.3125 57.7594L45.448 97.8949ZM49.9075 6.3067L43.6009 6.3067L43.6009 93.4354L49.9075 93.4354L56.2143 93.4354L56.2143 6.3067L49.9075 6.3067Z",
};

export const DOT_DIFFERENCE = withBlend(DOT, "difference");
export const RING_DIFFERENCE = withBlend(RING, "difference");
export const PREVIEW_DIFFERENCE = withBlend(PREVIEW, "difference");
export const ARROW_DIFFERENCE = withBlend(ARROW, "difference");
export const ENTER_ARROW_DIFFERENCE = withBlend(ENTER_ARROW, "difference");
