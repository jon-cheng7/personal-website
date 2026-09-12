"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { setCursorMode } from "@/lib/cursor/store";
import { resolveCursorMode } from "@/lib/cursor/modes";
import type { CursorModeRef } from "@/lib/cursor/types";

/**
 * The public surface presentation components use to opt into a cursor mode
 * — see claude/cursor-system-architecture.md §10 ("Public API design").
 * Nothing here reaches into lib/cursor/store.ts's pointer-position/
 * transition internals; this module only ever calls the one exported
 * `setCursorMode`, exactly like any other caller of the store would.
 *
 * Two ways to opt in, both resolved through the single delegated listener
 * below rather than each target wiring its own pointerover/pointerout:
 *  - `data-cursor="modeName"` directly on any element — no React wrapper
 *    needed. Add `data-cursor-src` (+ optional `data-cursor-media-kind`,
 *    default "image") to swap in a specific preview image/video without
 *    hand-writing a whole config, for the common "media" case.
 *  - `<CursorTarget cursor={...}>` for a config that doesn't reduce to a
 *    couple of data attributes — a one-off inline `CursorModeConfig`, or
 *    one computed from props/state (e.g. a project card's own accent
 *    color/preview).
 * A bare `<a>`/`<button>` with neither gets `"link"` for free.
 */

const targetRegistry = new WeakMap<Element, CursorModeRef>();

let listenerInstalled = false;

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

/** Walks up from the pointer's actual event target looking for the closest
 * element that opts into a cursor mode — a `<CursorTarget>`-registered
 * element, a `data-cursor` attribute, or a bare link/button — and stops at
 * the first match. Starting the walk at the real target and going up means
 * the *innermost* match always wins: a `<CursorTarget>` nested inside a
 * plain `<a>` still gets its own richer mode rather than being shadowed by
 * the outer link's default "link" (the spec's "nested cursor targets"
 * reliability requirement). */
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

/**
 * Installs the single delegated `pointerover`/`pointerout` listener this
 * whole opt-in system runs on. Called once, from components/cursor/global-
 * cursor.tsx's own mount effect (inside the same `pointer: fine` gate that
 * effect already applies) — so it's live on every page regardless of
 * whether that particular page happens to use `<CursorTarget>` or
 * `data-cursor` anywhere: a bare `<a>`/`<button>` still needs to resolve to
 * "link" even when nothing else on the page opts in. Idempotent (a second
 * call is a no-op) so it's safe to call from an effect that could run more
 * than once.
 */
export function installCursorTargetListener(): () => void {
  if (listenerInstalled) return () => {};
  listenerInstalled = true;

  const onOver = (event: PointerEvent) => {
    const found = resolveHoveredTarget(event.target as Element | null);
    setCursorMode(found?.ref ?? "default", found?.el ?? null);
  };
  // `pointerout` alone fires when the pointer moves between a matched
  // element and one of its own descendants/ancestors too, which would
  // otherwise bounce the cursor back to "default" and immediately back to
  // the real mode on the next `pointerover` — a visible flicker on any
  // target with nested markup. `relatedTarget` tells us whether the
  // pointer actually left the matched element's whole subtree or just
  // moved within it.
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

/**
 * Wraps arbitrary content and registers it as a cursor target for as long
 * as it's mounted — the richer alternative to `data-cursor` for a config
 * that isn't just a name (an inline `CursorModeConfig`, or one computed
 * from props). Renders a `display: contents` wrapper so it never affects
 * layout — the wrapper exists purely to have a real DOM node to register in
 * `targetRegistry`, exactly like `registerToneTarget`'s element-registration
 * pattern elsewhere in this codebase (lib/chrome-tone.ts).
 *
 * Registers once on mount and keeps the registered config current across
 * re-renders without re-registering (unmount during an active hover would
 * otherwise fall through to `revalidateTarget`'s "target disappeared" path
 * unnecessarily) — a config that changes across renders just updates the
 * same registry entry in place.
 */
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
