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
  /**
   * The one method components/transition-link.tsx actually calls. Covers
   * from `origin`, then runs `pushRoute` (typically `() => router.push(
   * href)`) inside a `startTransition` OWNED BY THE SCREEN-TRANSITION
   * COMPONENT ITSELF, and reveals once THAT transition's own `isPending`
   * clears.
   *
   * This can't just be "call `cover`, run `pushRoute` inside the caller's
   * own `startTransition`, then call `reveal` once the caller's own
   * `isPending` goes false" — that was the original, broken design. The
   * caller (a `<TransitionLink>`) is rendered by the very page content the
   * navigation is about to replace, so it UNMOUNTS in the exact commit
   * where its own `isPending` would flip back to `false` — React doesn't
   * run an unmounting component's effect for the render that unmounts it,
   * it only runs that effect's last-committed cleanup, so the reveal call
   * never fired and the wipe stayed covering the screen forever. Nav's own
   * copy of this "watch my own isPending, then act" pattern doesn't have
   * this problem only because `<Nav>` never unmounts between routes.
   * `<ScreenTransition>` (components/screen-transition.tsx), like `<Nav>`,
   * is mounted once in app/layout.tsx and never unmounts either — so
   * owning the `isPending` watch here, instead of on the page content that
   * triggered it, is what actually survives the navigation it's driving.
   */
  navigate(origin: ScreenTransitionOrigin, pushRoute: () => void): void;
}

let controller: ScreenTransitionController | null = null;

export function registerScreenTransition(next: ScreenTransitionController | null): void {
  controller = next;
}

export function getScreenTransition(): ScreenTransitionController | null {
  return controller;
}
