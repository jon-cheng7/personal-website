"use client";

// useScrollOut — JS fallback for the CSS scroll-out (`animation-timeline: view()`), for browsers without it (Firefox).
// Fits: IndexView (rows under .ix__head) + GalleryView (tiles under .hud). Same curve as the CSS:
//   --out = 0 when the item's top reaches the line → 1 when its bottom passes it.
// Per frame: reads all rects first, then writes only items whose value changed; [data-out] only while 0 < out.
// Browsers with scroll timelines: does nothing (CSS runs on the compositor).

import { useEffect, type RefObject } from "react";

export function useScrollOut(rootRef: RefObject<HTMLElement | null>, itemSelector: string, lineSelector: string, deps: unknown) {
  useEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()")) return;
    const root = rootRef.current;
    const lineEl = document.querySelector<HTMLElement>(lineSelector);
    if (!root || !lineEl) return;

    const last = new WeakMap<Element, number>();
    let raf = 0;

    const update = () => {
      raf = 0;
      const line = lineEl.getBoundingClientRect().bottom;
      const items = root.querySelectorAll<HTMLElement>(itemSelector);
      // read
      const vals: number[] = [];
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        vals.push(r.top >= line ? 0 : r.bottom <= line ? 1 : (line - r.top) / r.height);
      });
      // write
      items.forEach((el, i) => {
        const v = Math.round(vals[i] * 100) / 100;
        if (last.get(el) === v) return;
        last.set(el, v);
        if (v <= 0) {
          delete el.dataset.out;
          el.style.removeProperty("--out");
        } else {
          el.dataset.out = "";
          el.style.setProperty("--out", String(v));
        }
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      root.querySelectorAll<HTMLElement>(itemSelector).forEach((el) => {
        delete el.dataset.out;
        el.style.removeProperty("--out");
      });
    };
  }, [rootRef, itemSelector, lineSelector, deps]);
}
