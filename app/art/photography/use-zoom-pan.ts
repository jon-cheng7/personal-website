"use client";

// useZoomPan — smooth wheel / pinch / drag / double-click zoom + pan for one element, no library.
// Fits: PhotoViewer. `stageRef` = area that receives input + bounds panning; `layerRef` = element that gets the transform
// (its parent = untransformed box of the same size, used as the coordinate origin).
// Two states: `target` (where input wants to be) and `cur` (what's on screen). Wheel / keys / double-click glide cur → target
// on a frame-rate-independent ease (scale in log space, pinned to the cursor point so nothing wobbles). Drag + pinch are 1:1.
// will-change only while moving → browser re-rasterises crisp when the photo settles (no jagged scaled bitmap).

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export const MAX_ZOOM = 6;
const DOUBLE_ZOOM = 2.5;
const KEY_STEP = 1.6;
const DRAG_SLOP = 4; // px before a press counts as a drag (vs click)
const TAU = 95; // ms, glide time constant (~3τ to settle)

type View = { s: number; x: number; y: number };
/** cursor-pinned zoom: screen point (px, py) keeps showing local point (ux, uy) */
type Anchor = { px: number; py: number; ux: number; uy: number };

const HOME: View = { s: 1, x: 0, y: 0 };

export function useZoomPan(stageRef: RefObject<HTMLElement | null>, layerRef: RefObject<HTMLElement | null>, resetKey: unknown) {
  const target = useRef<View>(HOME);
  const cur = useRef<View>(HOME);
  const anchor = useRef<Anchor | null>(null);
  const raf = useRef(0);
  const [zoom, setZoom] = useState(1);
  /** true while the last press moved → suppress the click that follows */
  const dragged = useRef(false);

  const base = useCallback(() => layerRef.current?.parentElement?.getBoundingClientRect() ?? null, [layerRef]);

  /** clamp pan for scale n.s: smaller than stage → centred; larger → no gaps at the stage edges */
  const clamp = useCallback((n: View): View => {
    const stage = stageRef.current?.getBoundingClientRect();
    const b = base();
    if (!stage || !b || n.s <= 1.0005) return HOME;
    const axis = (pos: number, size: number, sPos: number, sSize: number, t: number) => {
      const len = size * n.s;
      if (len <= sSize) return sPos + (sSize - len) / 2 - pos;
      return Math.min(sPos - pos, Math.max(sPos + sSize - len - pos, t));
    };
    return { s: n.s, x: axis(b.left, b.width, stage.left, stage.width, n.x), y: axis(b.top, b.height, stage.top, stage.height, n.y) };
  }, [stageRef, base]);

  const write = useCallback((c: View) => {
    cur.current = c;
    const el = layerRef.current;
    if (el) el.style.transform = c.s === 1 && !c.x && !c.y ? "" : `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.s})`;
  }, [layerRef]);

  const setTarget = useCallback((t: View) => {
    target.current = t;
    setZoom(Math.round(t.s * 4) / 4); // quantised: UI label + srcset sizes change in steps
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    anchor.current = null;
    if (layerRef.current) layerRef.current.style.willChange = "";
  }, [layerRef]);

  /** glide cur → target */
  const run = useCallback(() => {
    if (raf.current) return;
    if (layerRef.current) layerRef.current.style.willChange = "transform";
    let last = performance.now();
    const tick = (now: number) => {
      const k = 1 - Math.exp(-(now - last) / TAU);
      last = now;
      const t = target.current;
      const c = cur.current;
      const s = Math.exp(Math.log(c.s) + (Math.log(t.s) - Math.log(c.s)) * k);
      let next: View;
      const a = anchor.current;
      const b = base();
      if (a && b) next = clamp({ s, x: a.px - b.left - a.ux * s, y: a.py - b.top - a.uy * s });
      else next = { s, x: c.x + (t.x - c.x) * k, y: c.y + (t.y - c.y) * k };
      const done = Math.abs(next.s - t.s) < 0.0015 && Math.abs(next.x - t.x) < 0.4 && Math.abs(next.y - t.y) < 0.4;
      write(done ? t : next);
      if (done) stop();
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [layerRef, base, clamp, write, stop]);

  /** zoom to scale s keeping client point (px, py) fixed on screen */
  const zoomAt = useCallback((s: number, px: number, py: number, smooth: boolean) => {
    const b = base();
    if (!b) return;
    const c = cur.current;
    const ns = Math.min(MAX_ZOOM, Math.max(1, s));
    const ux = (px - b.left - c.x) / c.s;
    const uy = (py - b.top - c.y) / c.s;
    const t = clamp({ s: ns, x: px - b.left - ux * ns, y: py - b.top - uy * ns });
    setTarget(t);
    if (smooth) {
      anchor.current = { px, py, ux, uy };
      run();
    } else {
      stop();
      write(t);
    }
  }, [base, clamp, setTarget, run, stop, write]);

  /** move to an absolute view (no anchor) */
  const goTo = useCallback((n: View, smooth: boolean) => {
    const t = clamp(n);
    setTarget(t);
    anchor.current = null;
    if (smooth) run();
    else {
      stop();
      write(t);
    }
  }, [clamp, setTarget, run, stop, write]);

  /** step zoom about the stage centre */
  const stepZoom = useCallback((f: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (r) zoomAt(target.current.s * f, r.left + r.width / 2, r.top + r.height / 2, true);
  }, [stageRef, zoomAt]);
  const zoomIn = useCallback(() => stepZoom(KEY_STEP), [stepZoom]);
  const zoomOut = useCallback(() => stepZoom(1 / KEY_STEP), [stepZoom]);
  const reset = useCallback(() => goTo(HOME, true), [goTo]);
  const panBy = useCallback((dx: number, dy: number) => {
    const t = target.current;
    goTo({ ...t, x: t.x + dx, y: t.y + dy }, true);
  }, [goTo]);

  // new photo → home, instantly
  useEffect(() => {
    stop();
    target.current = HOME;
    write(HOME);
    setZoom(1);
  }, [resetKey, stop, write]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // input
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number; d: number } | null = null;
    let travel = 0;
    let lastTap = 0;

    const mid = () => {
      const p = [...pointers.values()];
      if (p.length === 1) return { x: p[0].x, y: p[0].y, d: 0 };
      return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
    };

    const onWheel = (e: WheelEvent) => {
      // zoom only — never let the wheel reach the page / Lenis behind the viewer
      e.preventDefault();
      e.stopPropagation();
      // mouse notches (~100px) and trackpad pinch (ctrl + small deltas) both map to a gentle factor; target accumulates
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const k = e.ctrlKey ? 0.01 : 0.0022;
      zoomAt(target.current.s * Math.exp(-dy * k), e.clientX, e.clientY, true);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest("button:not([data-stage])")) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // capture only when there's something to drag (keeps plain clicks, e.g. backdrop → close, working at 1×)
      if (target.current.s > 1 || pointers.size > 1) {
        pointers.forEach((_, id) => {
          try { stage.setPointerCapture(id); } catch {}
        });
      }
      // grab whatever is on screen right now
      stop();
      target.current = cur.current;
      last = mid();
      if (pointers.size === 1) {
        travel = 0;
        dragged.current = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId) || !last) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const m = mid();
      travel += Math.hypot(m.x - last.x, m.y - last.y);
      if (travel > DRAG_SLOP) dragged.current = true;
      const c = cur.current;
      if (pointers.size >= 2 && last.d > 0) {
        // pinch: scale about midpoint, then follow midpoint
        zoomAt(c.s * (m.d / last.d), m.x, m.y, false);
        const n = cur.current;
        goTo({ ...n, x: n.x + (m.x - last.x), y: n.y + (m.y - last.y) }, false);
      } else if (c.s > 1) {
        goTo({ ...c, x: c.x + (m.x - last.x), y: c.y + (m.y - last.y) }, false);
      }
      last = m;
      stage.dataset.dragging = c.s > 1 || pointers.size > 1 ? "1" : "";
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      last = pointers.size ? mid() : null;
      if (!pointers.size) stage.dataset.dragging = "";
      // double tap (touch) — dblclick covers mouse
      if (e.pointerType === "touch" && !dragged.current) {
        const now = performance.now();
        if (now - lastTap < 300) {
          toggleAt(e.clientX, e.clientY);
          lastTap = 0;
        } else lastTap = now;
      }
    };

    const toggleAt = (x: number, y: number) => {
      if (target.current.s > 1) reset();
      else zoomAt(DOUBLE_ZOOM, x, y, true);
    };
    const onDbl = (e: MouseEvent) => toggleAt(e.clientX, e.clientY);
    const onResize = () => {
      target.current = clamp(target.current);
      write(clamp(cur.current));
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("dblclick", onDbl);
    window.addEventListener("resize", onResize);
    return () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("dblclick", onDbl);
      window.removeEventListener("resize", onResize);
    };
  }, [stageRef, zoomAt, goTo, reset, stop, clamp, write]);

  return { zoom, zoomIn, zoomOut, reset, panBy, dragged };
}
