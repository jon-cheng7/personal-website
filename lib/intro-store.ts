// Home intro phase broadcast: hidden → revealing → idle.
// Fits: set by Hero; Nav + cursor hide/reveal with it.

export type IntroPhase = "hidden" | "revealing" | "idle";

let phase: IntroPhase = "idle";
const listeners = new Set<(phase: IntroPhase) => void>();

/** Current phase (default idle). */
export function getIntroPhase(): IntroPhase {
  return phase;
}

/** Hero only. */
export function setIntroPhase(next: IntroPhase): void {
  if (next === phase) return;
  phase = next;
  listeners.forEach((listen) => listen(next));
}

/** Returns unsubscribe. */
export function subscribeIntroPhase(
  listener: (phase: IntroPhase) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
