// Canvas layouts. Scattered = cards roam freely inside a board region (region + random start spots);
// sorted = one row per section with a label (homes the cards spring to). Fits: resume-canvas.tsx, canvas/float.ts. Pure.

/** Card size (world px). Cards are fixed-size; content is styled to fit. */
export const CARD = { w: 1200, h: 820 };

export type Placed = { x: number; y: number };
export type Region = { x0: number; y0: number; x1: number; y1: number };

/** Free-roam board: ~5 card-areas of room per card, shaped 16:10, centred on 0,0. */
export function region(n: number): Region {
  const area = Math.max(n, 4) * CARD.w * CARD.h * 5;
  const w = Math.sqrt(area * 1.6);
  const h = w / 1.6;
  return { x0: -w / 2, y0: -h / 2, x1: w / 2, y1: h / 2 };
}

/** Random non-overlapping start spots inside the region (new every call). */
export function randomPlace(n: number, r: Region, gap = 160, rand = Math.random): Placed[] {
  const out: Placed[] = [];
  for (let i = 0; i < n; i++) {
    let best: Placed = { x: 0, y: 0 };
    let bestClear = -Infinity;
    for (let k = 0; k < 400; k++) {
      const p = {
        x: r.x0 + CARD.w / 2 + rand() * (r.x1 - r.x0 - CARD.w),
        y: r.y0 + CARD.h / 2 + rand() * (r.y1 - r.y0 - CARD.h),
      };
      const clear = Math.min(
        Infinity,
        ...out.map((q) => Math.max(Math.abs(p.x - q.x) - CARD.w, Math.abs(p.y - q.y) - CARD.h)),
      );
      if (clear >= gap) {
        best = p;
        break;
      }
      if (clear > bestClear) {
        bestClear = clear;
        best = p;
      }
    }
    out.push(best);
  }
  return out;
}

/** Sorted: a row per section (reading order), left-aligned; label sits left of each row. */
const SORT_GAP = { x: 240, y: 320 };
export function sortedLayout(sectionOf: string[]) {
  const rows: string[] = [];
  const col: number[] = [];
  const pos: Placed[] = sectionOf.map((sec) => {
    let r = rows.indexOf(sec);
    if (r < 0) r = rows.push(sec) - 1;
    const c = (col[r] = (col[r] ?? -1) + 1);
    return { x: c * (CARD.w + SORT_GAP.x), y: r * (CARD.h + SORT_GAP.y) };
  });
  const labels = rows.map((id, r) => ({ id, x: -CARD.w / 2 - 140, y: r * (CARD.h + SORT_GAP.y) }));
  return { pos, labels };
}

/** Bounding box of placed cards (+ pad on every side): centre + size. */
export function bounds(p: Placed[], pad = 0, extraLeft = 0) {
  const xs = p.map((q) => q.x);
  const ys = p.map((q) => q.y);
  const x0 = Math.min(...xs) - CARD.w / 2 - pad - extraLeft;
  const x1 = Math.max(...xs) + CARD.w / 2 + pad;
  const y0 = Math.min(...ys) - CARD.h / 2 - pad;
  const y1 = Math.max(...ys) + CARD.h / 2 + pad;
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
