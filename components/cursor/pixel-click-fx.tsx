"use client";

// PixelClickFx — click feedback for the pixel cursor set: press squash + an 8-bit burst at the click point.
// Fits: mounted by sections that use data-cursor="pixel" (/art, /art/photography). Renders nothing itself;
// bursts are throwaway DOM nodes animated by CSS (stepped = chunky), removed when done. Fine pointers only.
// Press squash: tags .cursor-root with data-pixel (while a pixel mode is active) + data-press (while held).

import { useEffect } from "react";
import { CURSOR_MODES } from "@/lib/cursor/modes";
import { subscribeToModeChange, getCurrentMode } from "@/lib/cursor/store";
import "./pixel-click-fx.css";

const PIXEL_MODES = new Set([CURSOR_MODES.pixel, CURSOR_MODES.pixelMove]);

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

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType === "touch") return;
      const mode = getCurrentMode();
      if (!PIXEL_MODES.has(mode)) return;
      const r = root();
      if (r) r.dataset.press = "";
      // clicking something interactive → heavier burst
      const hit = !!(e.target as Element | null)?.closest?.("a, button");
      if (!reduced) burst(e.clientX, e.clientY, hit);
    };
    const up = () => {
      const r = root();
      if (r) delete r.dataset.press;
    };

    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    return () => {
      unsub();
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const r = root();
      if (r) {
        delete r.dataset.pixel;
        delete r.dataset.press;
      }
    };
  }, []);

  return null;
}
