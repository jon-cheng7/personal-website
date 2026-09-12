/**
 * Module-level singleton connecting any link/trigger in the tree to the one
 * persistent `<ScreenTransition />` overlay (components/screen-transition.tsx,
 * mounted once in app/layout.tsx) — same "component registers an imperative
 * controller here, callers elsewhere read it" shape as lib/intro-store.ts's
 * phase broadcast, just imperative (cover/reveal are animations with a real
 * duration, not a plain state value) rather than a subscribable value.
 *
 * Why a controller object rather than exporting cover/reveal functions
 * directly from this module: the actual animation needs refs into the
 * mounted SVG overlay's DOM nodes, which only exist once
 * `<ScreenTransition />` has mounted. Registering the implementation here
 * on mount (and clearing it on unmount) means callers (components/
 * transition-link.tsx) never need to know whether the overlay happens to be
 * mounted yet — `getScreenTransition()` returning `null` is itself the
 * signal to just fall through to a plain, un-transitioned navigation.
 */

export interface ScreenTransitionOrigin {
  /** Viewport-relative pixel coordinates (same space as PointerEvent's
   * `clientX`/`clientY`, and lib/cursor/store.ts's `getPointerState()`). */
  x: number;
  y: number;
}

export interface ScreenTransitionController {
  /** Grows the wipe from `origin` until it covers the whole viewport.
   * Resolves once fully covered — callers do their route change then. */
  cover(origin: ScreenTransitionOrigin): Promise<void>;
  /** Opens a hole at the same origin the last `cover()` used, growing it
   * until the wipe has fully cleared. Resolves once fully revealed. */
  reveal(): Promise<void>;
}

let controller: ScreenTransitionController | null = null;

export function registerScreenTransition(next: ScreenTransitionController | null): void {
  controller = next;
}

export function getScreenTransition(): ScreenTransitionController | null {
  return controller;
}
