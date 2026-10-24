// Ink geometry for the markup layer: smoothed pressure strokes → filled SVG outline (freehand, tapered ends),
// simulated pressure for mouse/finger, eraser hit tests. Pure (no DOM). Units = sheet units (sheet width = 1000).
// Fits: markup-layer.tsx (live + committed strokes), markup-state.ts (mark types).

/** x, y (sheet units), pressure 0–1. */
export type Pt = [number, number, number];

/** Outline feel per tool. size = full width at pressure 1 (units). */
export type InkShape = {
  size: number;
  thinning: number; //  0 = constant width, 1 = width follows pressure fully
  taperStart: number; // units of length to grow in
  taperEnd: number; //   units of length to shrink out (only once the stroke is done)
};

/** Input smoothing: new point eases toward the raw pointer by this share (lower = smoother, laggier). */
const STREAMLINE = 0.45;
/** Ignore moves shorter than this (units). */
const MIN_STEP = 0.5;

/** Add a raw pointer sample to a live stroke (streamlined). Returns false if too close to keep. */
export function addPoint(pts: Pt[], x: number, y: number, p: number): boolean {
  const last = pts[pts.length - 1];
  if (!last) {
    pts.push([x, y, p]);
    return true;
  }
  const nx = last[0] + (x - last[0]) * STREAMLINE;
  const ny = last[1] + (y - last[1]) * STREAMLINE;
  if (Math.hypot(nx - last[0], ny - last[1]) < MIN_STEP) return false;
  pts.push([nx, ny, p]);
  return true;
}

/** Mouse / finger have no pressure: fake it from speed (fast = thin). Returns next smoothed pressure. */
export function speedPressure(prev: number, distUnits: number, dtMs: number): number {
  const speed = distUnits / Math.max(1, dtMs); // units per ms
  const target = Math.min(1, Math.max(0.28, 1 - speed * 0.55));
  return prev + (target - prev) * 0.25;
}

/** Stylus pressure, eased so light touches still draw. */
export const stylusPressure = (p: number) => Math.min(1, Math.max(0.12, Math.pow(p, 0.75)));

/** Filled outline path for a stroke. done = taper the tail. */
export function outlinePath(pts: Pt[], s: InkShape, done: boolean): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return dot(pts[0], radius(s, pts[0][2]));

  // cumulative length → tapers
  const dist = [0];
  for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = dist[dist.length - 1];
  if (total < 0.5) return dot(pts[0], radius(s, pts[0][2]));

  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const rads: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    let r = radius(s, pts[i][2]);
    if (s.taperStart > 0) r *= ease(Math.min(1, dist[i] / s.taperStart));
    if (done && s.taperEnd > 0) r *= ease(Math.min(1, (total - dist[i]) / s.taperEnd));
    r = Math.max(r, s.size * 0.06);
    rads.push(r);
    left.push([pts[i][0] - ty * r, pts[i][1] + tx * r]);
    right.push([pts[i][0] + ty * r, pts[i][1] - tx * r]);
  }

  // ring: left side forward, end cap, right side back, start cap
  const ring: [number, number][] = [...left];
  ring.push(...cap(pts[pts.length - 1], pts[pts.length - 2], rads[rads.length - 1]));
  ring.push(...right.reverse());
  ring.push(...cap(pts[0], pts[1], rads[0]));
  return smoothClosed(ring);
}

/** Distance from (x, y) to a polyline (units). */
export function distToPolyline(pts: Pt[], x: number, y: number): number {
  if (pts.length === 1) return Math.hypot(pts[0][0] - x, pts[0][1] - y);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return best;
}

// ---- helpers ----

const radius = (s: InkShape, p: number) => (s.size / 2) * (1 - s.thinning + s.thinning * p);
const ease = (t: number) => Math.sin((t * Math.PI) / 2);
const f = (n: number) => n.toFixed(2);

function dot([x, y]: Pt, r: number) {
  return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

/** Half-circle cap around p, bulging away from q (from the side normal (−ty, tx) round to its opposite). */
function cap(p: Pt, q: Pt, r: number): [number, number][] {
  let tx = p[0] - q[0];
  let ty = p[1] - q[1];
  const tl = Math.hypot(tx, ty) || 1;
  tx /= tl;
  ty /= tl;
  const out: [number, number][] = [];
  for (let k = 1; k < 8; k++) {
    const a = (k / 8) * Math.PI;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    out.push([p[0] + r * (-ty * c + tx * sn), p[1] + r * (tx * c + ty * sn)]);
  }
  return out;
}

/** Closed quadratic-midpoint curve through ring points. */
function smoothClosed(ring: [number, number][]) {
  const n = ring.length;
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(ring[n - 1], ring[0]);
  let d = `M${f(m0[0])} ${f(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const m = mid(p, ring[(i + 1) % n]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + "Z";
}
