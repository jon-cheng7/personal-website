/**
 * Builds a `clip-path: polygon(...)` string for a left-anchored reveal whose
 * leading (right) edge ripples like a liquid front instead of sweeping in as
 * a flat line — used by the nav drawer's open/close wipe (components/nav.tsx).
 *
 * `progress` is 0 (fully closed — nothing revealed) to 1 (fully open — the
 * whole drawer revealed). The wave's amplitude is shaped by
 * `sin(π · progress)`, which is exactly 0 at both progress=0 and progress=1
 * and peaks in the middle — so the shape always resolves to a perfectly
 * flat edge at rest (matching the drawer's plain closed/open CSS states)
 * and only wobbles mid-transition, with no special-casing needed at the
 * endpoints and no visual "pop" when a caller stops driving this and lets
 * the flat resting state take over.
 *
 * Two superimposed sine terms (different vertical frequency and travel
 * speed, one driving forward, one drifting back) avoid the perfectly
 * regular, mechanical look a single sine wave would have — closer to how an
 * actual liquid front is uneven along its edge rather than a clean scallop.
 *
 * Tuned down from an earlier pass that had too much movement (a combined
 * amplitude of up to 12 percentage points of width) and read as faceted
 * rather than fluid (only 14 sample points, and `clip-path: polygon()`
 * only ever draws straight lines between them — few points means visible
 * corners). `rows` is doubled to 28 for a visibly smoother curve at the
 * same rendering cost (still a fixed, cheap per-frame string build, not a
 * GPU-compositor-only transform/opacity animation — see the project doc's
 * "liquid-fill" note), and the amplitudes are cut to under half their
 * previous size for a calmer ripple that still reads as liquid rather than
 * a static diagonal edge.
 *
 * This is a prototype-quality approximation, not a fluid simulation: see
 * the project doc's "liquid-fill" feasibility note for the alternatives
 * (SVG gooey-blur filter, WebGL/shader) and why this compositing-friendly
 * approach was picked to prototype first.
 */
/** Sample-row density for the wave — shared by `buildLiquidClipPath` and
 * `buildLiquidToneBands` below so the two can never drift apart (the bands
 * approximate the exact same wave the polygon draws, at the same
 * resolution). */
export const LIQUID_WIPE_ROWS = 28;

/** The wave's raw edge position (0-100, a percentage of the drawer's own
 * width) at height-fraction `t` (0 = top, 1 = bottom) and reveal
 * `progress` `p` — the inner formula both `buildLiquidClipPath` and
 * `buildLiquidToneBands` are built from, factored out so they share one
 * source of truth instead of two copies of the same math. */
function waveEdgePercent(p: number, t: number): number {
  const envelope = Math.sin(Math.PI * p); // 0 at p=0 and p=1, peaks at p=0.5
  const primaryAmp = 4 * envelope; // percentage points of width
  const secondaryAmp = 1.25 * envelope;
  const wave =
    Math.sin(t * Math.PI * 1.4 + p * Math.PI * 1.2) * primaryAmp +
    Math.sin(t * Math.PI * 3.4 - p * Math.PI * 1.7) * secondaryAmp;
  return Math.min(100, Math.max(0, p * 100 + wave));
}

export function buildLiquidClipPath(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));

  const points: string[] = ["0% 0%"];
  for (let i = 0; i <= LIQUID_WIPE_ROWS; i++) {
    const t = i / LIQUID_WIPE_ROWS; // 0..1 down the drawer's height
    const x = waveEdgePercent(p, t);
    points.push(`${x.toFixed(2)}% ${(t * 100).toFixed(4)}%`);
  }
  points.push("0% 100%");

  return `polygon(${points.join(", ")})`;
}

export interface LiquidToneBand {
  /** Fraction (0-1) of the drawer's own height where this band starts. */
  top: number;
  /** Fraction (0-1) of the drawer's own height this band spans. */
  height: number;
  /** Fraction (0-1) of the drawer's own width that is *guaranteed* to
   * already show the lime fill for every y within this band, at this
   * progress. */
  reveal: number;
}

/**
 * Approximates the same wavy reveal boundary `buildLiquidClipPath` draws as
 * `LIQUID_WIPE_ROWS` flat horizontal bands, each given the *minimum* (most
 * conservative) reveal extent reached anywhere within that band's own
 * height range.
 *
 * Why this exists, and why "minimum": lib/chrome-tone.ts's geometry system
 * only understands axis-aligned rectangle regions (`data-chrome-tone`
 * elements read via `getBoundingClientRect()`) — it has no way to resolve
 * an actual wavy polygon boundary. The drawer's own DOM box is always the
 * full viewport regardless of how much of the wipe has revealed (`clip-
 * path` only changes what's *painted*, not the element's layout geometry),
 * so tagging `.menu-drawer` itself with `data-chrome-tone` would have told
 * the geometry system "the whole drawer is lime" the instant the drawer
 * opens — wrong for as long as the wipe is still mid-transition. Instead,
 * `components/nav.tsx` renders `LIQUID_WIPE_ROWS` small region elements
 * (`.menu-drawer__tone-band`), one per row here, and updates each one's
 * *width* (not its painted content — these are invisible, purely geometry)
 * to `reveal * 100%` on every tick of the same wipe tween that drives
 * `buildLiquidClipPath`, so their combined shape tracks the real reveal
 * band-by-band instead of claiming the whole drawer at once.
 *
 * Conservative (the minimum, not the maximum or midpoint) is the safe
 * direction specifically: the area *ahead* of a band's guaranteed reveal
 * still shows whatever's actually behind the drawer there (the page — the
 * clip-path hasn't revealed the drawer's lime fill yet), so a target
 * sitting in that sliver keeps resolving against that real backdrop's own
 * tone instead of assuming lime it isn't actually over — the failure mode
 * that direction avoids is a UI element assuming a lime background that
 * isn't there yet (e.g. rendering black over a still-black page). The
 * opposite error (briefly treating an already-lime sliver as "not yet
 * revealed") is the accepted trade-off: at worst a target uses the wrong
 * one of two already-legible tones for a few sub-second frames right at
 * the wave's leading edge, never an invisible one.
 *
 * Samples 3 points per band (both ends and the midpoint) rather than just
 * the two row boundaries, since the wave can in principle dip slightly
 * lower strictly between them — cheap, and removes that edge case rather
 * than documenting it as a further approximation on top of the row
 * approximation itself.
 */
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
