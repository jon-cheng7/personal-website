"use client";

// morph — View Transition where on-screen photos fly to their new spot (mode switch, sort, META toggle).
// Fits: photo-archive.tsx. Elements opt in with data-vt-id="<photo id>".
// Only photos visible before AND present after get a name → bounded snapshot cost (never all 99).
// No API / reduced motion → plain update.

import { flushSync } from "react-dom";

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

const SEL = "[data-vt-id]";

function visibleIds(root: ParentNode) {
  const ids = new Set<string>();
  const h = window.innerHeight;
  root.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < h && r.width > 0) ids.add(el.dataset.vtId!);
  });
  return ids;
}

function name(root: ParentNode, ids: Set<string>) {
  root.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
    // one name per id (duplicates abort the transition)
    const id = el.dataset.vtId!;
    el.style.viewTransitionName = ids.has(id) ? `ph-${id}` : "";
    ids.delete(id);
  });
}

function clear(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(SEL).forEach((el) => (el.style.viewTransitionName = ""));
}

let running = false;

/** run a React state update as a morph. root = archive element */
export function morph(update: () => void, root: HTMLElement | null) {
  const doc = document as VTDocument;
  if (!root || running || !doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  const before = visibleIds(root);
  name(root, new Set(before));
  running = true;
  document.documentElement.dataset.vt = "archive";

  const t = doc.startViewTransition(() => {
    flushSync(update);
    clear(root);
    name(root, new Set(before));
  });
  t.finished.finally(() => {
    clear(root);
    running = false;
    delete document.documentElement.dataset.vt;
  });
}
