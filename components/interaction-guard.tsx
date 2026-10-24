"use client";

// InteractionGuard — site-wide: no native drag of images / links (Firefox ignores CSS user-drag).
// Fits: mounted once in layout; text-selection is blocked in globals.css. Form fields + draggable="true" still work.

import { useEffect } from "react";

export function InteractionGuard() {
  useEffect(() => {
    const onDragStart = (e: DragEvent) => {
      const t = e.target as Element | null;
      if (t instanceof Element && t.closest('[draggable="true"], input, textarea')) return;
      e.preventDefault();
    };
    document.addEventListener("dragstart", onDragStart);
    return () => document.removeEventListener("dragstart", onDragStart);
  }, []);
  return null;
}
