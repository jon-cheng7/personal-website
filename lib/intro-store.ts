/**
 * Broadcasts the home hero's opening-sequence phase so the persistent nav
 * chrome (components/nav.tsx) and the global cursor (components/cursor/
 * global-cursor.tsx) — both mounted once in app/layout.tsx, on every route,
 * never unmounted between pages — can hide themselves for the opening beat
 * and reveal themselves back in sync with it, without components/hero.tsx
 * reaching into either directly. Same "module-level singleton + subscribe"
 * shape already used for lib/lenis-store.ts and lib/chrome-tone.ts's target
 * registry, and for the same reason: this is cross-component coordination
 * between siblings under RootLayout, not state that belongs to any one of
 * them.
 *
 * Only components/hero.tsx ever calls `setIntroPhase` — every other module
 * only reads or subscribes. Defaults to "idle" (nothing suppressed) so
 * every route other than Home is entirely unaffected by this module simply
 * existing — Hero never mounts there, so the phase never leaves "idle".
 *
 * Home's own "hide chrome on arrival" behavior does NOT depend on this
 * module's default — see nav.tsx's own comment on why it derives that
 * directly from the current pathname instead, so a stale "idle" left over
 * from an earlier visit this session can't cause the chrome to skip hiding
 * on a later visit to Home. This module only carries the *reveal* signal.
 */

export type IntroPhase = "hidden" | "revealing" | "idle";

let phase: IntroPhase = "idle";
const listeners = new Set<(phase: IntroPhase) => void>();

export function getIntroPhase(): IntroPhase {
  return phase;
}

export function setIntroPhase(next: IntroPhase): void {
  if (next === phase) return;
  phase = next;
  listeners.forEach((listen) => listen(next));
}

export function subscribeIntroPhase(
  listener: (phase: IntroPhase) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
