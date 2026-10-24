// Markup tools + palette: what each tool draws like, its label, and its cursor. Edit feel here.
// Fits: markup-layer.tsx (drawing), markup-bar.tsx (buttons), the site cursor (lib/cursor) via cursorFor().

import { RING, withBlend } from "@/lib/cursor/shapes";
import type { CursorModeConfig } from "@/lib/cursor/types";
import type { InkShape } from "./ink";

export type ToolId = "pen" | "pencil" | "marker" | "eraser";
export type InkTool = Exclude<ToolId, "eraser">;
export type ColorId = "lime" | "red" | "blue";

/** Palette: base + gradient tail (stroke runs base → tail in drawing direction). */
export const INKS: Record<ColorId, { label: string; base: string; tail: string }> = {
  lime: { label: "Green", base: "#c5fb45", tail: "#8fe23f" },
  red: { label: "Red", base: "#ff383c", tail: "#ff5f8a" },
  blue: { label: "Blue", base: "#0088ff", tail: "#4f5bff" },
};
export const COLOR_IDS = Object.keys(INKS) as ColorId[];

/** Tools in bar order. key = keyboard shortcut. */
export const TOOLS: { id: ToolId; label: string; spec: string; key: string }[] = [
  { id: "pen", label: "Pen", spec: "0.5", key: "p" },
  { id: "pencil", label: "Pencil", spec: "2B", key: "b" },
  { id: "marker", label: "Mark", spec: "HL", key: "h" },
  { id: "eraser", label: "Erase", spec: "", key: "e" },
];

/** Pen / pencil sizes: scale on the tool's base width + the label shown in the bar (mm-ish). Marker has one size. */
export type SizedTool = "pen" | "pencil";
export const SIZES = [1.75, 2.6, 3.8];
export const SIZE_SPECS: Record<SizedTool, string[]> = {
  pen: ["0.9", "1.4", "2.0"],
  pencil: ["1.6", "2.4", "3.5"],
};
export const isSized = (t: ToolId | null): t is SizedTool => t === "pen" || t === "pencil";

/** Stroke outline per ink tool (sheet units; sheet width = 1000). */
export const SHAPES: Record<InkTool, InkShape> = {
  pen: { size: 2.8, thinning: 0.6, taperStart: 14, taperEnd: 22 },
  pencil: { size: 3, thinning: 0.35, taperStart: 8, taperEnd: 12 },
  marker: { size: 15, thinning: 0, taperStart: 0, taperEnd: 0 },
};

/** Outline for a tool at a size scale (taper grows a little with width). */
export function shapeOf(tool: InkTool, scale = 1): InkShape {
  const s = SHAPES[tool];
  if (scale === 1) return s;
  const t = Math.sqrt(scale);
  return { ...s, size: s.size * scale, taperStart: s.taperStart * t, taperEnd: s.taperEnd * t };
}

/** Eraser reach (units). */
export const ERASER_R = 9;

/** Site cursor per tool + colour (cached: the cursor store compares by identity). */
const cursorCache = new Map<string, CursorModeConfig>();
export function cursorFor(tool: ToolId, color: ColorId, scale = 1): CursorModeConfig {
  const key = `${tool}:${color}:${scale}`;
  let c = cursorCache.get(key);
  if (c) return c;
  const ink = INKS[color].base;
  const snappy = { tracking: { duration: 0.01, ease: "none" }, transitionMs: 140 };
  if (tool === "eraser")
    c = {
      shape: withBlend({ ...RING, width: 22, height: 22 }, "difference"),
      content: { kind: "none" },
      color: "transparent",
      stroke: { width: 1.5, color: "#ffffff" },
      ...snappy,
    };
  else if (tool === "marker")
    c = { shape: { kind: "simple", width: 8, height: 20, radius: 2, rotate: 18 }, content: { kind: "none" }, color: ink, ...snappy };
  else {
    const d = Math.round((tool === "pen" ? 7 : 5) * Math.sqrt(scale));
    c = {
      shape: { kind: "simple", width: d, height: d, radius: "50%" },
      content: { kind: "none" },
      color: ink,
      stroke: { width: 1, color: "rgba(0,0,0,0.35)" },
      ...snappy,
    };
  }
  cursorCache.set(key, c);
  return c;
}
