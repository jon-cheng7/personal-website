// Which technique a shape→shape transition uses.
// Fits: global-cursor transitions.

import type { CursorShape } from "./types";

export type MorphTechnique = "css" | "svg-morph";

/** simple↔simple = CSS/GSAP box; any SVG = MorphSVG. */
export function morphTechniqueFor(from: CursorShape, to: CursorShape): MorphTechnique {
  if (from.kind === "simple" && to.kind === "simple") return "css";
  return "svg-morph";
}

const MORPH_SPACE = { width: 100, height: 100 };

/** Simple shape as SVG path (for morphing to/from SVG). */
export function rectToPath(shape: Extract<CursorShape, { kind: "simple" }>): {
  path: string;
  viewBox: string;
} {
  const { width: boxW, height: boxH } = MORPH_SPACE;
  const scale = Math.min(boxW / shape.width, boxH / shape.height);
  const w = shape.width * scale;
  const h = shape.height * scale;
  const offsetX = (boxW - w) / 2;
  const offsetY = (boxH - h) / 2;

  const rawRadius =
    typeof shape.radius === "number"
      ? shape.radius
      : shape.radius.trim().endsWith("%")
        ? (parseFloat(shape.radius) / 100) * Math.min(shape.width, shape.height)
        : parseFloat(shape.radius);
  const r = Math.max(0, Math.min(rawRadius * scale, Math.min(w, h) / 2));

  const path = [
    `M ${offsetX + r} ${offsetY}`,
    `H ${offsetX + w - r}`,
    `A ${r} ${r} 0 0 1 ${offsetX + w} ${offsetY + r}`,
    `V ${offsetY + h - r}`,
    `A ${r} ${r} 0 0 1 ${offsetX + w - r} ${offsetY + h}`,
    `H ${offsetX + r}`,
    `A ${r} ${r} 0 0 1 ${offsetX} ${offsetY + h - r}`,
    `V ${offsetY + r}`,
    `A ${r} ${r} 0 0 1 ${offsetX + r} ${offsetY}`,
    "Z",
  ].join(" ");

  return { path, viewBox: `0 0 ${boxW} ${boxH}` };
}
