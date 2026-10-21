// Lengths (px/vw/vh/rem, sums) and times (screens/cues) → numbers or CSS.
// Fits: used by engine.ts (numbers) and scene.tsx (first-frame CSS).

/** px | "50vw" | "45vh" | "2rem" | "50vw - 10vh". */
export type Length = number | string;
/** Screens | "cue" | "cue + 0.4". */
export type Time = number | string;

export type Viewport = { vw: number; vh: number; rem: number };

const TERM = /([+-]?)\s*(-?\d*\.?\d+)\s*(vw|vh|px|rem)?/g;

/** Length → px for a viewport. */
export function toPx(value: Length, vp: Viewport): number {
  if (typeof value === "number") return value;
  let total = 0;
  let matched = false;
  for (const m of value.matchAll(TERM)) {
    if (!m[2]) continue;
    matched = true;
    const sign = m[1] === "-" ? -1 : 1;
    const n = parseFloat(m[2]);
    const unit = m[3] ?? "px";
    const px =
      unit === "vw" ? (n / 100) * vp.vw
      : unit === "vh" ? (n / 100) * vp.vh
      : unit === "rem" ? n * vp.rem
      : n;
    total += sign * px;
  }
  if (!matched && process.env.NODE_ENV !== "production") {
    console.warn(`[choreo] can't read length "${value}"`);
  }
  return total;
}

/** Length → CSS value (calc for sums). */
export function toCss(value: Length): string {
  if (typeof value === "number") return `${value}px`;
  return /\s[+-]\s/.test(value) ? `calc(${value})` : value;
}

/** Time → screens. Throws on unknown cue. */
export function toTime(value: Time, cues: Record<string, number>): number {
  if (typeof value === "number") return value;
  const m = value.match(/^\s*([A-Za-z_][\w-]*)?\s*([+-]\s*\d*\.?\d+)?\s*$/);
  if (!m) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    throw new Error(`[choreo] can't read time "${value}"`);
  }
  const [, name, offset] = m;
  let base = 0;
  if (name) {
    if (!(name in cues)) throw new Error(`[choreo] unknown cue "${name}"`);
    base = cues[name];
  }
  return base + (offset ? parseFloat(offset.replace(/\s+/g, "")) : 0);
}

/** Resolve cues that reference other cues. */
export function resolveCues(cues: Record<string, Time> = {}): Record<string, number> {
  const out: Record<string, number> = {};
  const pending = new Set(Object.keys(cues));
  for (let pass = 0; pass < 20 && pending.size; pass++) {
    for (const name of [...pending]) {
      try {
        out[name] = toTime(cues[name], out);
        pending.delete(name);
      } catch {
      }
    }
  }
  if (pending.size) {
    throw new Error(`[choreo] couldn't resolve cues: ${[...pending].join(", ")}`);
  }
  return out;
}
