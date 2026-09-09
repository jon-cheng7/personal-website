import type Lenis from "lenis";

// A tiny mutable holder so components mounted outside <SmoothScroll> (e.g.
// the nav drawer in components/nav.tsx) can pause/resume Lenis's scroll
// handling — e.g. while a modal/drawer overlay is open — without wiring up
// a React context provider just for this one cross-component need.
let instance: Lenis | null = null;

export function setLenisInstance(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenisInstance(): Lenis | null {
  return instance;
}
