// Canvas camera: view = { x, y } centre + w (world width visible). Flights between views. Pure.
// Fits: resume-canvas.tsx. Near target → direct pan (+zoom), no zoom-out. Far → van Wijk & Nuij
// "smooth and efficient zooming and panning" (zoom out, travel, zoom in). Any flight can start from
// any view, so a new command mid-flight simply starts a new flight from where the camera is.

export type View = { x: number; y: number; w: number };
export type Flight = { at: (t: number) => View; ms: number };

/** Direct path when centres are within this many view widths. */
const NEAR = 1.5;
const RHO = Math.SQRT2;

export function flight(a: View, b: View): Flight {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d <= NEAR * Math.max(a.w, b.w)) return direct(a, b, d);
  return vanWijk(a, b);
}

/** Straight pan, geometric zoom. */
function direct(a: View, b: View, d: number): Flight {
  const zoom = Math.abs(Math.log(b.w / a.w));
  return {
    ms: clamp(420 + 260 * zoom + 120 * (d / Math.max(a.w, b.w)), 0, 1100),
    at: (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w * Math.pow(b.w / a.w, t) }),
  };
}

/** Optimal zoom-pan path (same maths as d3.interpolateZoom). */
function vanWijk(a: View, b: View): Flight {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d1 = Math.hypot(dx, dy);
  const w0 = a.w;
  const w1 = b.w;
  const r2 = RHO * RHO;
  const r4 = r2 * r2;
  const b0 = (w1 * w1 - w0 * w0 + r4 * d1 * d1) / (2 * w0 * r2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - r4 * d1 * d1) / (2 * w1 * r2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / RHO;
  const c0 = Math.cosh(r0);
  return {
    ms: clamp(S * 620, 750, 1700),
    at: (t) => {
      const s = t * S;
      const u = (w0 / (r2 * d1)) * (c0 * Math.tanh(RHO * s + r0) - Math.sinh(r0));
      return { x: a.x + u * dx, y: a.y + u * dy, w: (w0 * c0) / Math.cosh(RHO * s + r0) };
    },
  };
}

/** View that fits a w×h rect centred at (x, y), filling `fill` of the viewport. */
export function fit(x: number, y: number, w: number, h: number, vw: number, vh: number, fill = 0.84): View {
  return { x, y, w: Math.max(w / fill, ((h / fill) * vw) / vh) };
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Used when a flight interrupts another (camera already moving → don't restart from rest). */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
