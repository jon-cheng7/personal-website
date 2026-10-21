// Named cursor modes (default, link, media, arrow, star, enter…).
// Fits: data-cursor="name" picks one.

import type { CursorModeConfig } from "./types";
import {
  ARROW_DIFFERENCE,
  DOT_DIFFERENCE,
  ENTER_ARROW_DIFFERENCE,
  PREVIEW_DIFFERENCE,
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

/** Name or config → config (unknown → default). */
export function resolveCursorMode(
  ref: string | import("./types").CursorModeConfig | undefined,
): CursorModeConfig {
  if (!ref) return CURSOR_MODES.default;
  if (typeof ref === "string") return CURSOR_MODES[ref] ?? CURSOR_MODES.default;
  return ref;
}
