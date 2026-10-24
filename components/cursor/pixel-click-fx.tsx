"use client";

// PixelClickFx — click feedback for the pixel cursor set: press squash + an 8-bit burst at the click point.
// Fits: mounted by sections that use data-cursor="pixel" (/art, /art/photography). Renders nothing itself;
// bursts are throwaway DOM nodes animated by CSS (stepped = chunky), removed when done. Fine pointers only.
// Press squash: tags .cursor-root with data-pixel (while a pixel mode is active) + data-press (while held).
// Pan surfaces (hand cursor): no squash, and the burst waits for release — fires only if the pointer didn't
// travel (a click); a drag swaps to the closed hand instead, so panning stays calm.

import { useEffect } from "react";
import { CURSOR_MODES } from "@/lib/cursor/modes";
import { getCurrentMode, lockCursorMode, subscribeToModeChange } from "@/lib/cursor/store";
import "./pixel-click-fx.css";

const PIXEL_MODES = new Set([CURSOR_MODES.pixel, CURSOR_MODES.pixelMove, CURSOR_MODES.pixelGrab]);
/** px of travel that turns a press on a pan surface into a drag */
const DRAG_PX = 4;
/** capture: surfaces that stop propagation (zoom/pan, map) still get seen */
const OPTS = { passive: true, capture: true } as const;

/** 8 bits: 4 straight + 4 diagonal, px offsets (multiples of 2 → stays on the pixel grid) */
const BITS = [
  [0, -22], [16, -16], [22, 0], [16, 16], [0, 22], [-16, 16], [-22, 0], [-16, -16],
];

/** View Transition slot names (pixel-click-fx.css). A burst gets its own live layer, so a view switch
 *  started by the same click can't freeze it or bury it under the page snapshot. Cycled; unique while alive. */
const VT_SLOTS = 8;
let slot = 0;

function burst(x: number, y: number, link: boolean) {
  const fx = document.createElement("div");
  fx.className = `pxfx${link ? " pxfx--link" : ""}`;
  fx.style.viewTransitionName = `pxfx-${slot++ % VT_SLOTS}`;
  fx.style.left = `${Math.round(x)}px`;
  fx.style.top = `${Math.round(y)}px`;
  fx.setAttribute("aria-hidden", "true");
  let html = '<span class="pxfx__ring"></span><span class="pxfx__ring pxfx__ring--2"></span>';
  for (const [dx, dy] of BITS) html += `<span class="pxfx__bit" style="--dx:${dx}px;--dy:${dy}px"></span>`;
  fx.innerHTML = html;
  document.body.appendChild(fx);
  window.setTimeout(() => fx.remove(), 600);
}

export function PixelClickFx() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = () => document.querySelector<HTMLElement>(".cursor-root");

    const sync = () => {
      const r = root();
      if (!r) return;
      if (PIXEL_MODES.has(getCurrentMode())) r.dataset.pixel = "";
      else delete r.dataset.pixel;
    };
    sync();
    const unsub = subscribeToModeChange(sync);

    // press on a pan surface: undecided until it moves (drag) or lifts (click)
    let pan: { x: number; y: number; id: number; hit: boolean; drag: boolean } | null = null;

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType === "touch") return;
      const mode = getCurrentMode();
      if (!PIXEL_MODES.has(mode)) return;
      // clicking something interactive → heavier burst
      const hit = !!(e.target as Element | null)?.closest?.("a, button");
      if (mode === CURSOR_MODES.pixelMove && !hit) {
        pan = { x: e.clientX, y: e.clientY, id: e.pointerId, hit, drag: false };
        return;
      }
      const r = root();
      if (r) r.dataset.press = "";
      if (!reduced) burst(e.clientX, e.clientY, hit);
    };
    const move = (e: PointerEvent) => {
      if (!pan || pan.drag || e.pointerId !== pan.id) return;
      if (Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < DRAG_PX) return;
      pan.drag = true;
      lockCursorMode(CURSOR_MODES.pixelGrab);
    };
    const up = (e: PointerEvent) => {
      const r = root();
      if (r) delete r.dataset.press;
      if (!pan || e.pointerId !== pan.id) return;
      if (pan.drag) lockCursorMode(null);
      else if (!reduced && e.type === "pointerup") burst(pan.x, pan.y, pan.hit);
      pan = null;
    };

    window.addEventListener("pointerdown", down, OPTS);
    window.addEventListener("pointermove", move, OPTS);
    window.addEventListener("pointerup", up, OPTS);
    window.addEventListener("pointercancel", up, OPTS);
    return () => {
      unsub();
      window.removeEventListener("pointerdown", down, OPTS);
      window.removeEventListener("pointermove", move, OPTS);
      lockCursorMode(null);
      window.removeEventListener("pointerup", up, OPTS);
      window.removeEventListener("pointercancel", up, OPTS);
      const r = root();
      if (r) {
        delete r.dataset.pixel;
        delete r.dataset.press;
      }
    };
  }, []);

  return null;
}
