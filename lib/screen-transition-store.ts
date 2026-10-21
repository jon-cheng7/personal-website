// Imperative handle to the route wipe overlay.
// Fits: ScreenTransition registers; TransitionLink calls.

/** Where the wipe starts (click point). */
export interface ScreenTransitionOrigin {
  x: number;
  y: number;
}

/** cover → navigate → reveal. */
export interface ScreenTransitionController {
  cover(origin: ScreenTransitionOrigin): Promise<void>;
  reveal(): Promise<void>;
  navigate(origin: ScreenTransitionOrigin, pushRoute: () => void): void;
}

let controller: ScreenTransitionController | null = null;

/** ScreenTransition only. */
export function registerScreenTransition(next: ScreenTransitionController | null): void {
  controller = next;
}

/** null if overlay not mounted. */
export function getScreenTransition(): ScreenTransitionController | null {
  return controller;
}
