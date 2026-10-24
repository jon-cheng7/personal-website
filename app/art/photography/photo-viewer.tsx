"use client";

// PhotoViewer — full-screen single frame with the full viewfinder HUD, zoom + pan.
// Fits: opened from any archive view (?photo=<id>). Owns keys while open:
//   ←/→ step (pan when zoomed) · +/− zoom · 0 reset · M meta · Esc reset zoom → close.
// Zoom: wheel / trackpad pinch / touch pinch / drag / double-click (use-zoom-pan.ts).
// Sharpness: `sizes` scales with zoom → browser fetches a bigger srcset candidate (up to full master width).

import { useEffect, useRef, type CSSProperties } from "react";
import { Photo } from "@/components/ui/photo";
import type { Photo as PhotoData } from "@/content/photos";
import { getLenisInstance } from "@/lib/lenis-store";
import { placeShort } from "./format";
import { MAX_ZOOM, useZoomPan } from "./use-zoom-pan";
import { ViewfinderHud } from "./viewfinder-hud";
import "./photo-viewer.css";

type Props = {
  photos: PhotoData[];
  id: string;
  meta: boolean;
  onMeta: () => void;
  onChange: (id: string) => void;
  onClose: () => void;
};

const PAN_STEP = 120;

export function PhotoViewer({ photos, id, meta, onMeta, onChange, onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const i = Math.max(0, photos.findIndex((p) => p.id === id));
  const p = photos[i];
  const go = (d: number) => onChange(photos[(i + d + photos.length) % photos.length].id);
  const { zoom, zoomIn, zoomOut, reset, panBy, dragged } = useZoomPan(stageRef, layerRef, id);
  const zoomed = zoom > 1;

  // open: stop page scroll, focus close; close: restore both
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const lenis = getLenisInstance();
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    // belt and braces: no wheel may scroll the page while the viewer is open (zoom handler still receives it)
    const blockWheel = (e: WheelEvent) => e.preventDefault();
    window.addEventListener("wheel", blockWheel, { passive: false, capture: true });
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("wheel", blockWheel, { capture: true });
      lenis?.start();
      document.documentElement.style.overflow = "";
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "escape") zoomed ? reset() : onClose();
      else if (k === "arrowright" || k === "l") zoomed ? panBy(-PAN_STEP, 0) : go(1);
      else if (k === "arrowleft" || k === "h") zoomed ? panBy(PAN_STEP, 0) : go(-1);
      else if (zoomed && (k === "arrowup" || k === "k")) panBy(0, PAN_STEP);
      else if (zoomed && (k === "arrowdown" || k === "j")) panBy(0, -PAN_STEP);
      else if (k === "+" || k === "=") zoomIn();
      else if (k === "-" || k === "_") zoomOut();
      else if (k === "0") reset();
      else if (k === "m") onMeta();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!p) return null;

  // ceil → load the next size up as soon as zoom passes a step
  const sizes = zoomed ? `${Math.ceil(zoom) * 100}vw` : "100vw";

  return (
    <div
      ref={stageRef}
      className="pv"
      data-lenis-prevent
      data-cursor={zoomed ? "pixelMove" : "pixel"}
      data-zoomed={zoomed || undefined}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${i + 1} of ${photos.length}: ${placeShort(p)}`}
    >
      <button
        type="button"
        className="pv__backdrop"
        data-stage
        data-cursor={zoomed ? "pixelMove" : "pixel"}
        tabIndex={-1}
        aria-hidden
        onClick={() => !dragged.current && !zoomed && onClose()}
      />

      <div className="pv__fit" style={{ "--ar": p.width / p.height } as CSSProperties}>
        <div ref={layerRef} className="pv__zoom">
          <div key={p.id} className="pv__frame">
            <Photo photo={p} sizes={sizes} priority />
          </div>
        </div>
        <ViewfinderHud photo={p} on={meta} frame={i + 1} total={photos.length} />
      </div>

      <div className="pv__bar">
        <button type="button" onClick={() => go(-1)} aria-label="Previous photo">
          ← PREV
        </button>
        <button type="button" aria-pressed={meta} onClick={onMeta}>
          META {meta ? "ON" : "OFF"}
        </button>
        <span className="pv__zoomctl" role="group" aria-label="Zoom">
          <button type="button" onClick={zoomOut} disabled={!zoomed} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="pv__zoomval" onClick={reset} disabled={!zoomed} aria-label="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
            +
          </button>
        </span>
        <button type="button" onClick={() => go(1)} aria-label="Next photo">
          NEXT →
        </button>
        <button ref={closeRef} type="button" className="pv__close" onClick={onClose}>
          CLOSE <kbd>ESC</kbd>
        </button>
      </div>
    </div>
  );
}
