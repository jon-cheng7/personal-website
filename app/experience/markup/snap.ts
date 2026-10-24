// Smart highlighter: a roughly horizontal marker stroke snaps to the text line under it (whole words).
// DOM-only (caret hit tests + Range rects). Fits: markup-layer.tsx calls snapToText() when a marker stroke ends.

import type { Pt } from "./ink";

/** Highlight band in sheet units. */
export type Band = { x: number; y: number; w: number; h: number };

/**
 * Stroke (units) → one band over the words it crossed, or null (keep it freehand).
 * sheet = the paper element; overlay must be pointer-events: none while this runs (caret hit tests).
 */
export function snapToText(sheet: HTMLElement, pts: Pt[]): Band | null {
  if (pts.length < 2) return null;
  const box = sheet.getBoundingClientRect();
  const k = box.width / 1000; // px per unit
  const xs = pts.map((p) => box.left + p[0] * k);
  const ys = pts.map((p) => box.top + p[1] * k);
  const lh = parseFloat(getComputedStyle(sheet).fontSize) * 1.35;
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  if (Math.max(...ys) - Math.min(...ys) > lh * 1.3 || x1 - x0 < lh * 0.6) return null; // not a horizontal swipe
  const cy = [...ys].sort((a, b) => a - b)[ys.length >> 1];

  const a = caretAt(x0 + 1, cy);
  const b = caretAt(x1 - 1, cy);
  if (!a || !b || !sheet.contains(a.node) || !sheet.contains(b.node)) return null;

  const range = document.createRange();
  try {
    const startFirst = a.node === b.node ? a.offset <= b.offset : !!(a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING);
    const [s, e] = startFirst ? [a, b] : [b, a];
    range.setStart(s.node, wordStart(s.node, s.offset));
    range.setEnd(e.node, wordEnd(e.node, e.offset));
  } catch {
    return null;
  }

  // rects on the swiped line only, merged into one band
  let L = Infinity;
  let R = -Infinity;
  let T = Infinity;
  let B = -Infinity;
  for (const r of Array.from(range.getClientRects())) {
    if (r.width < 1 || r.height < 1) continue;
    if (r.top > cy + lh * 0.5 || r.bottom < cy - lh * 0.5) continue;
    L = Math.min(L, r.left);
    R = Math.max(R, r.right);
    T = Math.min(T, r.top);
    B = Math.max(B, r.bottom);
  }
  if (!isFinite(L)) return null;
  const h = B - T;
  const pad = h * 0.12;
  return {
    x: (L - pad - box.left) / k,
    y: (T + h * 0.14 - box.top) / k,
    w: (R - L + pad * 2) / k,
    h: (h * 0.78) / k,
  };
}

/** Text caret at a viewport point (standard API, else WebKit's). */
function caretAt(x: number, y: number): { node: Text; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let node: Node | undefined;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    node = p?.offsetNode;
    offset = p?.offset ?? 0;
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    node = r?.startContainer;
    offset = r?.startOffset ?? 0;
  }
  return node && node.nodeType === Node.TEXT_NODE ? { node: node as Text, offset } : null;
}

const isSpace = (c: string | undefined) => !c || /\s/.test(c);

function wordStart(t: Text, i: number) {
  const s = t.data;
  if (i < s.length && isSpace(s[i])) return skipSpace(s, i); // started in a gap → next word
  while (i > 0 && !isSpace(s[i - 1])) i--;
  return i;
}
function wordEnd(t: Text, i: number) {
  const s = t.data;
  if (i > 0 && isSpace(s[i - 1])) {
    while (i > 0 && isSpace(s[i - 1])) i--; // ended in a gap → previous word
    return i;
  }
  while (i < s.length && !isSpace(s[i])) i++;
  return i;
}
function skipSpace(s: string, i: number) {
  while (i < s.length && isSpace(s[i])) i++;
  return i;
}
