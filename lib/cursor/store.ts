import type { CursorModeConfig, CursorModeRef } from "./types";
import { CURSOR_MODES, resolveCursorMode } from "./modes";

/**
 * Module-level singleton, deliberately NOT React state — this is the same
 * pattern already established in this codebase for lib/chrome-tone.ts and
 * lib/lenis-store.ts, and for the same reason: position/velocity update on
 * every `pointermove`, and routing that through `useState`/a re-render
 * would mean React re-rendering on every single pointer event. Everything
 * here is read directly by components/cursor/global-cursor.tsx inside a
 * GSAP ticker callback (already running continuously in this codebase for
 * Lenis/ScrollTrigger sync) instead.
 *
 * Mode *changes*, unlike position, are discrete rather than continuous —
 * those go through `subscribeToModeChange` so GlobalCursor can build a
 * transition exactly when one actually happens, rather than polling every
 * frame for a change that almost never occurred.
 */

export interface CursorPointerState {
  x: number;
  y: number;
  /** Pixels/second, signed. */
  vx: number;
  vy: number;
  /** Scalar speed, px/second — convenience so callers don't all
   * recompute `Math.hypot(vx, vy)` themselves. */
  speed: number;
  /** Movement direction in radians (`Math.atan2(dy, dx)`), only updated
   * while actually moving — holds its last value at rest rather than
   * snapping to 0, so "which way was it last headed" stays meaningful. */
  angle: number;
}

const pointerState: CursorPointerState = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, angle: 0 };
let lastMoveTime: number | null = null;

let currentMode: CursorModeConfig = CURSOR_MODES.default;
let currentTargetEl: Element | null = null;

type ModeListener = (mode: CursorModeConfig, previous: CursorModeConfig) => void;
const modeListeners = new Set<ModeListener>();

/** Called from the delegated `pointermove` listener (see cursor-target.tsx)
 * with real client coordinates. Derives velocity/direction from the delta
 * against the previous call — clamped to a 1ms minimum `dt` so two events
 * arriving in the same frame (some browsers coalesce, some don't) can't
 * divide by ~0 and produce a velocity spike. */
export function updatePointerPosition(x: number, y: number): void {
  const now = performance.now();
  if (lastMoveTime !== null) {
    const dt = Math.max(1, now - lastMoveTime) / 1000;
    const dx = x - pointerState.x;
    const dy = y - pointerState.y;
    pointerState.vx = dx / dt;
    pointerState.vy = dy / dt;
    pointerState.speed = Math.hypot(pointerState.vx, pointerState.vy);
    // Only update direction while actually moving a meaningful amount —
    // otherwise sub-pixel jitter at rest would spin `angle` randomly.

    const DIRECTION_SPEED_THRESHOLD = 100;

    if (pointerState.speed > DIRECTION_SPEED_THRESHOLD) {
      pointerState.angle = Math.atan2(dy, dx);
    }
  }
  pointerState.x = x;
  pointerState.y = y;
  lastMoveTime = now;
}

/** Returns the live state object — callers read it every tick rather than
 * copying, since it's updated in place and this is a hot path. */
export function getPointerState(): CursorPointerState {
  return pointerState;
}

export function getCurrentMode(): CursorModeConfig {
  return currentMode;
}

/** Sets the active mode. `targetEl` is the DOM element that resolved to
 * this mode (the closest-matched `CursorTarget`/`data-cursor`/link), kept
 * so `revalidateTarget` below can notice if it disappears mid-transition.
 * A no-op (position-only) update when the resolved mode is unchanged —
 * e.g. moving between two sibling elements that both declare `"link"`
 * shouldn't retrigger a transition, just update which element is "current"
 * for revalidation purposes. */
export function setCursorMode(ref: CursorModeRef, targetEl: Element | null): void {
  const resolved = resolveCursorMode(ref);
  if (resolved === currentMode) {
    currentTargetEl = targetEl;
    return;
  }
  const previous = currentMode;
  currentMode = resolved;
  currentTargetEl = targetEl;
  modeListeners.forEach((listen) => listen(resolved, previous));
}

/** Falls back to `"default"` if the element that produced the current mode
 * has been removed from the document — e.g. a route change while hovering
 * a link that's about to unmount. Call on every `pointermove`/`pointerover`
 * (cheap: `Element.isConnected` is O(1), no tree walk) so the cursor never
 * stays stuck showing a mode for content that no longer exists. */
export function revalidateTarget(): void {
  if (currentTargetEl && !currentTargetEl.isConnected) {
    setCursorMode("default", null);
  }
}

export function subscribeToModeChange(listener: ModeListener): () => void {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}
