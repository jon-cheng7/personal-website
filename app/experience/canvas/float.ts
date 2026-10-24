// Card motion. Scattered: cards ROAM the board freely — each keeps moving and wanders (smooth random turning),
// soft walls keep them on the board, cards push each other apart, the focused card is pinned and kept clear.
// Sorted: cards spring to their row homes with a gentle drift. Tiny 2D sim, fixed substeps. Pure (no DOM).
// Fits: resume-canvas.tsx calls roam() or tether() every frame, then writes positions to the cards.

import { CARD, hash, mulberry32, type Placed, type Region } from "./board";

export type Body = { x: number; y: number; vx: number; vy: number };

/** Feel. Distances in world px, times in s. */
export const FLOAT = {
  speed: 300, //       roaming cruise speed (each card ±25%)
  turn: 1.1, //        max wander turn rate (rad/s)
  steer: 2.2, //       how fast a card settles to cruise speed / heading
  wall: 6, //          soft-wall stiffness
  wallZone: 420, //    walls start pushing this far inside the board edge
  push: 26, //         card–card repulsion
  gap: 120, //         min clear space between cards
  focusGap: 320, //    clear space kept around the focused card
  // sorted layout
  ampSorted: 45, //    drift around row homes
  spring: 3.2,
  damping: 3.4,
};

type Wave = { f1: number; f2: number; p1: number; p2: number; speed: number };

/** Per-card randomness, seeded by id (wander rhythm, cruise speed). */
export function waves(ids: string[]): Wave[] {
  return ids.map((id) => {
    const r = mulberry32(hash(id));
    const tau = Math.PI * 2;
    return {
      f1: tau / (5 + r() * 6),
      f2: tau / (9 + r() * 9),
      p1: r() * tau,
      p2: r() * tau,
      speed: FLOAT.speed * (0.75 + r() * 0.5),
    };
  });
}

/** Smooth wander signal in [-1, 1]. */
const wander = (w: Wave, t: number) => 0.6 * Math.sin(t * w.f1 + w.p1) + 0.4 * Math.sin(t * w.f2 + w.p2);

/** Free roaming inside region r. */
export function roam(bodies: Body[], wv: Wave[], r: Region, t: number, dt: number, pinned: number | null) {
  const L = r.x0 + CARD.w / 2 + FLOAT.wallZone;
  const R = r.x1 - CARD.w / 2 - FLOAT.wallZone;
  const T = r.y0 + CARD.h / 2 + FLOAT.wallZone;
  const B = r.y1 - CARD.h / 2 - FLOAT.wallZone;
  integrate(bodies, dt, pinned, FLOAT.push, (i, b, h, a) => {
    const w = wv[i];
    // heading = current direction of travel, turned a little by the wander signal
    const sp = Math.hypot(b.vx, b.vy);
    let ang = sp > 1 ? Math.atan2(b.vy, b.vx) : wander(w, t * 0.7 + i) * Math.PI;
    ang += wander(w, t) * FLOAT.turn * h;
    a.x += FLOAT.steer * (Math.cos(ang) * w.speed - b.vx);
    a.y += FLOAT.steer * (Math.sin(ang) * w.speed - b.vy);
    // soft walls (card edges stay on the board)
    if (b.x < L) a.x += FLOAT.wall * (L - b.x);
    if (b.x > R) a.x -= FLOAT.wall * (b.x - R);
    if (b.y < T) a.y += FLOAT.wall * (T - b.y);
    if (b.y > B) a.y -= FLOAT.wall * (b.y - B);
  });
}

/** Spring to homes + gentle drift (sorted layout). boost 0–1 = rearranging: stiff, critically damped, no collisions. */
export function tether(bodies: Body[], homes: Placed[], wv: Wave[], t: number, dt: number, pinned: number | null, boost = 0) {
  const spring = FLOAT.spring + 9 * boost;
  const damping = Math.max(FLOAT.damping, 2.1 * Math.sqrt(spring) * boost);
  integrate(bodies, dt, pinned, FLOAT.push * (1 - boost) * (1 - boost), (i, b, _h, a) => {
    const w = wv[i];
    const dx = FLOAT.ampSorted * wander(w, t * 0.35);
    const dy = FLOAT.ampSorted * 0.7 * wander(w, t * 0.3 + 2);
    a.x += spring * (homes[i].x + dx - b.x) - damping * b.vx;
    a.y += spring * (homes[i].y + dy - b.y) - damping * b.vy;
  });
}

/** Shared integrator: per-body force + pairwise separation (axis of least overlap). Pinned body never moves. */
function integrate(
  bodies: Body[],
  dt: number,
  pinned: number | null,
  push: number,
  force: (i: number, b: Body, h: number, a: { x: number; y: number }) => void,
) {
  const n = bodies.length;
  const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / sub;
  const acc = Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  for (let s = 0; s < sub; s++) {
    for (let i = 0; i < n; i++) {
      acc[i].x = 0;
      acc[i].y = 0;
      if (i !== pinned) force(i, bodies[i], h, acc[i]);
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const focus = i === pinned || j === pinned;
        const gap = focus ? FLOAT.focusGap : FLOAT.gap;
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const ox = CARD.w + gap - Math.abs(dx);
        const oy = CARD.h + gap - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        const k = focus ? FLOAT.push * 1.5 : push;
        let fx = 0;
        let fy = 0;
        if (ox / CARD.w < oy / CARD.h) fx = k * ox * (dx >= 0 ? 1 : -1);
        else fy = k * oy * (dy >= 0 ? 1 : -1);
        const wi = j === pinned ? 2 : i === pinned ? 0 : 1; // pinned pushes but isn't pushed
        const wj = i === pinned ? 2 : j === pinned ? 0 : 1;
        acc[i].x -= fx * wi;
        acc[i].y -= fy * wi;
        acc[j].x += fx * wj;
        acc[j].y += fy * wj;
      }
    }
    for (let i = 0; i < n; i++) {
      if (i === pinned) continue;
      const b = bodies[i];
      b.vx += acc[i].x * h;
      b.vy += acc[i].y * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
    }
  }
}
