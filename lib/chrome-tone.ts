// Nav chrome color by geometry: regions declare data-chrome-tone; light/dark copies clipped to them.
// Fits: regions = any element with data-chrome-tone; targets = ChromeToneMask copies.

/** "light-on-dark" | "dark-on-light". */
export type ChromeTone = "light-on-dark" | "dark-on-light";

const TONES: ChromeTone[] = ["light-on-dark", "dark-on-light"];

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Region {
  rect: Rect;
  tone: ChromeTone;
  depth: number;
  overlayPriority: number;
}

interface ToneTarget {
  el: HTMLElement;
  copies: Partial<Record<ChromeTone, HTMLElement>>;
}

const targets = new Set<ToneTarget>();
let rafId: number | null = null;

function toRect(domRect: DOMRect): Rect {
  return {
    left: domRect.left,
    top: domRect.top,
    right: domRect.right,
    bottom: domRect.bottom,
  };
}

function hasArea(r: Rect): boolean {
  return r.right > r.left && r.bottom > r.top;
}

function intersectRects(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const r = { left, top, right, bottom };
  return hasArea(r) ? r : null;
}

function subtractRect(rect: Rect, cut: Rect): Rect[] {
  const pieces: Rect[] = [];
  if (cut.top > rect.top) {
    pieces.push({ left: rect.left, top: rect.top, right: rect.right, bottom: cut.top });
  }
  if (cut.bottom < rect.bottom) {
    pieces.push({ left: rect.left, top: cut.bottom, right: rect.right, bottom: rect.bottom });
  }
  if (cut.left > rect.left) {
    pieces.push({ left: rect.left, top: cut.top, right: cut.left, bottom: cut.bottom });
  }
  if (cut.right < rect.right) {
    pieces.push({ left: cut.right, top: cut.top, right: rect.right, bottom: cut.bottom });
  }
  return pieces.filter(hasArea);
}

function depthOf(el: Element): number {
  let depth = 0;
  let node: Element | null = el;
  while (node) {
    depth++;
    node = node.parentElement;
  }
  return depth;
}

function syncThemeFollowers(): void {
  const ambientTone = document.documentElement.dataset.chromeTone;
  if (ambientTone !== "light-on-dark" && ambientTone !== "dark-on-light") return;
  document
    .querySelectorAll<HTMLElement>("[data-chrome-tone-follow-theme]")
    .forEach((el) => {
      if (el.dataset.chromeTone !== ambientTone) {
        el.dataset.chromeTone = ambientTone;
      }
    });
}

/** Collect tone regions (deepest wins). */
function readRegions(): Region[] {
  syncThemeFollowers();
  const nodes = document.querySelectorAll<HTMLElement>("[data-chrome-tone]");
  const regions: Region[] = [];
  nodes.forEach((node) => {
    const tone = node.dataset.chromeTone;
    if (tone !== "light-on-dark" && tone !== "dark-on-light") return;
    regions.push({
      rect: toRect(node.getBoundingClientRect()),
      tone,
      depth: depthOf(node),
      overlayPriority: node.hasAttribute("data-chrome-tone-overlay") ? 1 : 0,
    });
  });
  regions.sort((a, b) => a.overlayPriority - b.overlayPriority || a.depth - b.depth);
  return regions;
}

const FALLBACK_TONE: ChromeTone = "dark-on-light";

/** Rects of a target covered by each tone. */
function paintTarget(targetRect: Rect, regions: Region[]): { tone: ChromeTone; rect: Rect }[] {
  let painted: { tone: ChromeTone; rect: Rect }[] = [{ tone: FALLBACK_TONE, rect: targetRect }];

  for (const region of regions) {
    const clipped = intersectRects(targetRect, region.rect);
    if (!clipped) continue;

    const next: { tone: ChromeTone; rect: Rect }[] = [];
    for (const piece of painted) {
      const overlap = intersectRects(piece.rect, clipped);
      if (!overlap) {
        next.push(piece);
        continue;
      }
      for (const remainder of subtractRect(piece.rect, overlap)) {
        next.push({ tone: piece.tone, rect: remainder });
      }
    }
    next.push({ tone: region.tone, rect: clipped });
    painted = next;
  }

  return painted;
}

function rectsToClipPath(rects: Rect[], targetRect: Rect): string {
  if (rects.length === 0) {
    return "inset(0 0 100% 0)";
  }
  const subpaths = rects.map((r) => {
    const x1 = (r.left - targetRect.left).toFixed(2);
    const y1 = (r.top - targetRect.top).toFixed(2);
    const x2 = (r.right - targetRect.left).toFixed(2);
    const y2 = (r.bottom - targetRect.top).toFixed(2);
    return `M ${x1} ${y1} H ${x2} V ${y2} H ${x1} Z`;
  });
  return `path("${subpaths.join(" ")}")`;
}

/** Clip every target's copies. */
function applyChromeTone(): void {
  const regions = readRegions();

  targets.forEach(({ el, copies }) => {
    const targetRect = toRect(el.getBoundingClientRect());
    if (!hasArea(targetRect)) return; 

    const painted = paintTarget(targetRect, regions);

    for (const tone of TONES) {
      const copyEl = copies[tone];
      if (!copyEl) continue;
      const rectsForTone = painted.filter((p) => p.tone === tone).map((p) => p.rect);
      copyEl.style.clipPath = rectsToClipPath(rectsForTone, targetRect);
    }
  });
}

function tick(): void {
  applyChromeTone();
  rafId = targets.size > 0 ? requestAnimationFrame(tick) : null;
}

/** Schedule an update next frame (scroll, resize, theme, drawer). */
export function requestChromeToneUpdate(): void {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(tick);
}

/** Register a chrome element's tone copies. Returns unregister. */
export function registerToneTarget(
  el: HTMLElement,
  copies: Partial<Record<ChromeTone, HTMLElement>>,
): () => void {
  const entry: ToneTarget = { el, copies };
  targets.add(entry);
  requestChromeToneUpdate();
  return () => {
    targets.delete(entry);
  };
}
