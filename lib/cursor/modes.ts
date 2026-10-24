// Named cursor modes (default, link, media, arrow, star, enter…).
// Fits: data-cursor="name" picks one.

import type { CursorModeConfig } from "./types";
import {
  ARROW_DIFFERENCE,
  DOT_DIFFERENCE,
  ENTER_ARROW_DIFFERENCE,
  PIXEL_ARROW,
  PIXEL_GRAB,
  PIXEL_HAND,
  PREVIEW_DIFFERENCE,
  RETRO_ARROW,
  RETRO_HAND,
  RING_DIFFERENCE,
  STAR,
} from "./shapes";

/** Add/edit modes here. */
export const CURSOR_MODES: Record<string, CursorModeConfig> = {
  default: {
    shape: DOT_DIFFERENCE,
    content: { kind: "none" },
    color: "#c5fb45",
    tracking: { duration: 0.15, ease: "power3" },
  },

  link: {
    shape: RING_DIFFERENCE,
    content: { kind: "none" },
    color: "transparent",
    stroke: { width: 1.5, color: "#c5fb45" },
    tracking: { duration: 0.35, ease: "power3" },
  },

  media: {
    shape: PREVIEW_DIFFERENCE,
    content: { kind: "media", mediaKind: "image", src: "" },
    tracking: { duration: 0.5, ease: "power2", stretchWithVelocity: true, maxStretch: 0.12 },
  },

  arrow: {
    shape: ARROW_DIFFERENCE,
    content: { kind: "none" },
    color: "#c5fb45",
    tracking: { duration: 0.3, ease: "power3" },
  },

  star: {
  shape: STAR,
  content: { kind: "none" },
  color: "#000",
  tracking: {
    duration: 0.35,
    ease: "power3",
  },
},

  trail: {
    shape: DOT_DIFFERENCE,
    content: { kind: "none" },
    color: "#c5fb45",
    tracking: { duration: 0.15, ease: "power3" },
    trail: {
      midEase: 0.25,
      tailEase: 0.15,
      midColor: "#0088FF",
      tailColor: "#FF383C",
      width: 2,
    },
  },

  enter: {
    shape: ENTER_ARROW_DIFFERENCE,
    content: { kind: "none" },
    color: "#c5fb45",
    tracking: { duration: 0.3, ease: "power3" },
    idleMotion: { type: "bob", amplitude: 4, durationS: 1.4 },
  },
};

/** Retro OS pointers (terminal). White + black outline, no lag. */
CURSOR_MODES.retro = {
  shape: RETRO_ARROW,
  content: { kind: "none" },
  color: "#ffffff",
  stroke: { width: 1.5, color: "#000000" },
  anchor: { x: 0.24, y: 0.02 },
  tracking: { duration: 0.02, ease: "none" },
  transitionMs: 160,
};
CURSOR_MODES.retroHand = {
  ...CURSOR_MODES.retro,
  shape: RETRO_HAND,
  anchor: { x: 0.44, y: 0.03 },
};

/** Pixel set (art archive): lime fill, 1px dark outline (= one bitmap pixel), near-zero lag. No hover variant:
 *  scope with data-cursor="pixel" + data-cursor-link="pixel" so links/buttons keep the same arrow.
 *  pixelMove = open hand over a pan surface (zoomed photo, geo map); pixelGrab = closed hand while dragging
 *  (locked by pixel-click-fx). Click burst + press squash: components/cursor/pixel-click-fx.tsx. */
CURSOR_MODES.pixel = {
  shape: PIXEL_ARROW,
  content: { kind: "none" },
  color: "#c5fb45",
  stroke: { width: 1, color: "#0a0a0a" },
  anchor: { x: 0, y: 0 },
  tracking: { duration: 0.04, ease: "none" },
  transitionMs: 220,
  appear: "steps",
};
CURSOR_MODES.pixelMove = { ...CURSOR_MODES.pixel, shape: PIXEL_HAND, anchor: { x: 0.42, y: 0.5 } };
CURSOR_MODES.pixelGrab = { ...CURSOR_MODES.pixelMove, shape: PIXEL_GRAB, transitionMs: 90 };

/** Name or config → config (unknown → default). */
export function resolveCursorMode(
  ref: string | import("./types").CursorModeConfig | undefined,
): CursorModeConfig {
  if (!ref) return CURSOR_MODES.default;
  if (typeof ref === "string") return CURSOR_MODES[ref] ?? CURSOR_MODES.default;
  return ref;
}
