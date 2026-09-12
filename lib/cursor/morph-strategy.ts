import type { CursorShape } from "./types";

/**
 * The explicit "how should this shape transition happen" decision table —
 * see the project doc's "Morphing strategy" section for the full
 * reasoning. Kept as one small, testable module rather than an ad hoc
 * choice made inline wherever a transition happens to be built, so the
 * rule is easy to audit and doesn't quietly drift per call site.
 */
export type MorphTechnique = "css" | "svg-morph";

export function morphTechniqueFor(from: CursorShape, to: CursorShape): MorphTechnique {
  // simple -> simple never touches SVG at all: width/height/border-radius/
  // rotate/skew tweening is strictly cheaper and visually equivalent for
  // this case, so forcing it through path morphing would only cost more
  // for no benefit — directly the thing the spec asks not to do.
  if (from.kind === "simple" && to.kind === "simple") return "css";
  // Anything touching an "svg" shape on either side needs a real path
  // tween — MorphSVGPlugin's own topology normalization (adding points to
  // whichever side has fewer) is what avoids self-intersection/twisting
  // between genuinely different silhouettes; reimplementing that by hand
  // isn't worth it when the plugin already solves it and is free to use
  // (see the project doc's library-choice section).
  return "svg-morph";
}

/** The shared coordinate space every "svg"-kind mode in lib/cursor/modes.ts
 * is authored against (see types.ts's comment on the "svg" shape variant).
 * `rectToPath` always converts into this same box so a `simple -> svg`
 * transition always has two paths in one consistent coordinate space to
 * morph between, regardless of the simple shape's own actual pixel size —
 * final on-screen scale is handled separately, by tweening the shell's
 * rendered width/height exactly like a simple shape's, never by animating
 * `viewBox` itself. */
const MORPH_SPACE = { width: 100, height: 100 };

/** Converts a "simple" rounded-rect/circle shape into an equivalent SVG
 * path inscribed in `MORPH_SPACE`, so a `simple -> svg` transition can hand
 * MorphSVGPlugin two real paths to tween between instead of needing a
 * shape author to hand-write a path for what's really just a rounded
 * rectangle. Approximates corners with cubic bezier arcs (the standard SVG
 * rounded-rect construction) — plenty accurate for a cursor-sized shell,
 * and MorphSVGPlugin only needs *a* reasonable path to normalize against,
 * not a mathematically exact one. Preserves the shape's own aspect ratio
 * and (proportionally) its radius, so a circle still reads as circular and
 * a pill still reads as a pill once inscribed in the shared box. */
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
  // Clamp so a "circle" (radius >= half the smaller dimension) still
  // produces a valid, non-overlapping rounded-rect path rather than
  // malformed arcs.
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
