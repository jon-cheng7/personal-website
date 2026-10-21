// Shared Lenis instance (pause/resume, scrollTo).
// Fits: set by SmoothScroll; read by Nav, ScrollMemory, choreo overlay.

import type Lenis from "lenis";

let instance: Lenis | null = null;

/** Called by SmoothScroll. */
export function setLenisInstance(lenis: Lenis | null) {
  instance = lenis;
}

/** null until mounted. */
export function getLenisInstance(): Lenis | null {
  return instance;
}
