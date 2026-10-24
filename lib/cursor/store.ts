// Cursor state outside React: pointer pos/velocity + current mode.
// Fits: written by listeners, read in GlobalCursor ticker.

import type { CursorModeConfig, CursorModeRef } from "./types";
import { CURSOR_MODES, resolveCursorMode } from "./modes";

/** Position, velocity, last move time. */
export interface CursorPointerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  angle: number;
}

const pointerState: CursorPointerState = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, angle: 0 };
let lastMoveTime: number | null = null;

let currentMode: CursorModeConfig = CURSOR_MODES.default;
let currentTargetEl: Element | null = null;

type ModeListener = (mode: CursorModeConfig, previous: CursorModeConfig) => void;
const modeListeners = new Set<ModeListener>();

/** On pointermove. */
export function updatePointerPosition(x: number, y: number): void {
  const now = performance.now();
  if (lastMoveTime !== null) {
    const dt = Math.max(1, now - lastMoveTime) / 1000;
    const dx = x - pointerState.x;
    const dy = y - pointerState.y;
    pointerState.vx = dx / dt;
    pointerState.vy = dy / dt;
    pointerState.speed = Math.hypot(pointerState.vx, pointerState.vy);

    const DIRECTION_SPEED_THRESHOLD = 100;

    if (pointerState.speed > DIRECTION_SPEED_THRESHOLD) {
      pointerState.angle = Math.atan2(dy, dx);
    }
  }
  pointerState.x = x;
  pointerState.y = y;
  lastMoveTime = now;
}

/** Per-frame read. */
export function getPointerState(): CursorPointerState {
  return pointerState;
}

export function getCurrentMode(): CursorModeConfig {
  return currentMode;
}

/** Change mode (+ target element). While locked, only remembered — applied on unlock. */
export function setCursorMode(ref: CursorModeRef, targetEl: Element | null): void {
  if (lock) {
    wanted = { ref, el: targetEl };
    return;
  }
  apply(ref, targetEl);
}

function apply(ref: CursorModeRef, targetEl: Element | null): void {
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

/** Hold a mode regardless of hover (e.g. the grab hand while dragging); null releases it and applies
 *  whatever hover asked for in the meantime (or the mode from before the lock). */
let lock = false;
let wanted: { ref: CursorModeRef; el: Element | null } | null = null;
export function lockCursorMode(ref: CursorModeRef | null): void {
  if (ref) {
    if (!lock) wanted = { ref: currentMode, el: currentTargetEl };
    lock = true;
    apply(ref, currentTargetEl);
  } else if (lock) {
    lock = false;
    const w = wanted;
    wanted = null;
    if (w) apply(w.ref, w.el);
  }
}

/** Drop mode if target left the DOM. */
export function revalidateTarget(): void {
  if (currentTargetEl && !currentTargetEl.isConnected) {
    setCursorMode("default", null);
  }
}

/** Returns unsubscribe. */
export function subscribeToModeChange(listener: ModeListener): () => void {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}
