// Liquid-edge clip-path for the nav drawer wipe.
// Fits: nav.tsx (visual) + chrome-tone bands.

/** Polygon rows (smoothness). */
export const LIQUID_WIPE_ROWS = 28;

function waveEdgePercent(p: number, t: number): number {
  const envelope = Math.sin(Math.PI * p); 
  const primaryAmp = 4 * envelope; 
  const secondaryAmp = 1.25 * envelope;
  const wave =
    Math.sin(t * Math.PI * 1.4 + p * Math.PI * 1.2) * primaryAmp +
    Math.sin(t * Math.PI * 3.4 - p * Math.PI * 1.7) * secondaryAmp;
  return Math.min(100, Math.max(0, p * 100 + wave));
}

/** progress 0 (closed) → 1 (open) → clip-path polygon. */
export function buildLiquidClipPath(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));

  const points: string[] = ["0% 0%"];
  for (let i = 0; i <= LIQUID_WIPE_ROWS; i++) {
    const t = i / LIQUID_WIPE_ROWS; 
    const x = waveEdgePercent(p, t);
    points.push(`${x.toFixed(2)}% ${(t * 100).toFixed(4)}%`);
  }
  points.push("0% 100%");

  return `polygon(${points.join(", ")})`;
}

/** Revealed band per row (for chrome tone). */
export interface LiquidToneBand {
  top: number;
  height: number;
  reveal: number;
}

/** Same wave math as the clip, as tone regions. */
export function buildLiquidToneBands(progress: number): LiquidToneBand[] {
  const p = Math.min(1, Math.max(0, progress));
  const bands: LiquidToneBand[] = [];
  for (let i = 0; i < LIQUID_WIPE_ROWS; i++) {
    const t0 = i / LIQUID_WIPE_ROWS;
    const t1 = (i + 1) / LIQUID_WIPE_ROWS;
    const tMid = (t0 + t1) / 2;
    const minEdge = Math.min(
      waveEdgePercent(p, t0),
      waveEdgePercent(p, tMid),
      waveEdgePercent(p, t1),
    );
    bands.push({ top: t0, height: t1 - t0, reveal: minEdge / 100 });
  }
  return bands;
}
