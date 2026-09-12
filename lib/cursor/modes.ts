import type { CursorModeConfig } from "./types";
import {
  ARROW_DIFFERENCE,
  DOT_DIFFERENCE,
  ENTER_ARROW_DIFFERENCE,
  PREVIEW_DIFFERENCE,
  RING_DIFFERENCE,
  STAR,
} from "./shapes";


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

  // Home's circular "more about me" link (components/hero.tsx) — a single,
  // specific target, so a bespoke "go into this" shape rather than the
  // generic "link" ring. The arrow itself always points down (see
  // lib/cursor/shapes.ts's ENTER_ARROW comment on why nothing here ever
  // rotates it); `idleMotion` layers a gentle, continuous vertical bob on
  // top of that static orientation for as long as this mode stays active,
  // read as "there's more below, come on in" rather than a static glyph.
  enter: {
    shape: ENTER_ARROW_DIFFERENCE,
    content: { kind: "none" },
    color: "#c5fb45",
    tracking: { duration: 0.3, ease: "power3" },
    idleMotion: { type: "bob", amplitude: 4, durationS: 1.4 },
  },
};

/** Resolves a `CursorModeRef` (a named mode, or an inline config already
 * shaped like one) down to a concrete `CursorModeConfig`. Falls back to
 * `default` for an unknown name rather than throwing — a typo in a
 * `data-cursor` attribute should degrade to the plain pointer, not break
 * the page. */
export function resolveCursorMode(
  ref: string | import("./types").CursorModeConfig | undefined,
): CursorModeConfig {
  if (!ref) return CURSOR_MODES.default;
  if (typeof ref === "string") return CURSOR_MODES[ref] ?? CURSOR_MODES.default;
  return ref;
}
