"use client";

// How elements opt into cursor modes.
// Fits: `data-cursor="mode"` on any element, or <CursorTarget cursor={config}>. Bare a/button → link mode.

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { setCursorMode } from "@/lib/cursor/store";
import { resolveCursorMode } from "@/lib/cursor/modes";
import type { CursorModeRef } from "@/lib/cursor/types";

const targetRegistry = new WeakMap<Element, CursorModeRef>();

let listenerInstalled = false;

/** data-cursor (+ data-cursor-src / -media-kind) → mode ref. */
function modeFromDataAttrs(node: Element): CursorModeRef {
  const name = node.getAttribute("data-cursor");
  const src = node.getAttribute("data-cursor-src");
  if (name && src) {
    const base = resolveCursorMode(name);
    return {
      ...base,
      content: {
        kind: "media",
        mediaKind: node.getAttribute("data-cursor-media-kind") === "video" ? "video" : "image",
        src,
      },
    };
  }
  return name ?? "link";
}

/** Innermost target from an event target. */
function resolveHoveredTarget(start: Element | null): { el: Element; ref: CursorModeRef } | null {
  let node: Element | null = start;
  while (node) {
    if (targetRegistry.has(node)) {
      return { el: node, ref: targetRegistry.get(node)! };
    }
    if (node.hasAttribute("data-cursor")) {
      return { el: node, ref: modeFromDataAttrs(node) };
    }
    if (node.matches("a, button")) {
      return { el: node, ref: "link" };
    }
    node = node.parentElement;
  }
  return null;
}

/** One delegated pointerover listener for the page. */
export function installCursorTargetListener(): () => void {
  if (listenerInstalled) return () => {};
  listenerInstalled = true;

  const onOver = (event: PointerEvent) => {
    const found = resolveHoveredTarget(event.target as Element | null);
    setCursorMode(found?.ref ?? "default", found?.el ?? null);
  };
  const onOut = (event: PointerEvent) => {
    const leavingTo = event.relatedTarget as Element | null;
    if (!resolveHoveredTarget(leavingTo)) {
      setCursorMode("default", null);
    }
  };

  window.addEventListener("pointerover", onOver);
  window.addEventListener("pointerout", onOut);

  return () => {
    listenerInstalled = false;
    window.removeEventListener("pointerover", onOver);
    window.removeEventListener("pointerout", onOut);
  };
}

/** Wrapper for rich/dynamic cursor configs. */
export function CursorTarget({
  cursor,
  children,
}: {
  cursor: CursorModeRef;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    targetRegistry.set(el, cursor);
    return () => {
      targetRegistry.delete(el);
    };
  }, [cursor]);

  return (
    <span ref={ref} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
