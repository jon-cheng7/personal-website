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
export function buildLiquidClipPath(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  const rows = 28;
  const envelope = Math.sin(Math.PI * p); // 0 at p=0 and p=1, peaks at p=0.5
  const primaryAmp = 4 * envelope; // percentage points of width
  const secondaryAmp = 1.25 * envelope;

  const points: string[] = ["0% 0%"];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows; // 0..1 down the drawer's height
    const wave =
      Math.sin(t * Math.PI * 1.4 + p * Math.PI * 1.2) * primaryAmp +
      Math.sin(t * Math.PI * 3.4 - p * Math.PI * 1.7) * secondaryAmp;
    const x = Math.min(100, Math.max(0, p * 100 + wave));
    points.push(`${x.toFixed(2)}% ${(t * 100).toFixed(4)}%`);
  }
  points.push("0% 100%");

  return `polygon(${points.join(", ")})`;
}
