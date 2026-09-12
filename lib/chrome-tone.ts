/**
 * Shared geometry-based "which chrome tone applies here" system, replacing
 * the earlier SVG-filter posterized-difference approach entirely (that
 * sampled/inverted the actual backdrop pixels; this reacts only to known,
 * explicitly-declared background regions — see the project doc for why
 * Jon asked for the switch).
 *
 * The model: any element in the page can carry `data-chrome-tone="light-
 * on-dark"` or `data-chrome-tone="dark-on-light"` to declare "the content
 * painted on top of me, in this area, should use the light/dark chrome
 * treatment." A guaranteed-visibility UI element (a nav icon, the logo, a
 * letter, the cursor) registers itself as a "target" via
 * `registerToneTarget`, supplying one pre-styled DOM element per tone it
 * knows how to render (e.g. a white copy and a black copy of the same
 * icon). On every update, this module:
 *
 * 1. Reads every `[data-chrome-tone]` element's current `getBoundingClientRect()`
 *    — real layout geometry, not pixel sampling, not a screenshot, not
 *    Canvas/WebGL.
 * 2. For each registered target, intersects those region rects against the
 *    target's own rect, and — respecting DOM nesting (a region nested
 *    inside another wins over its ancestor for the overlapping area, so a
 *    small "light" section inside a "dark" page still reads correctly) —
 *    resolves the target's own box into a set of same-tone sub-rectangles.
 *    This is genuinely a 2D rectangle clip, so a region boundary that
 *    happens to fall in the middle of a letter, an icon stroke, or the
 *    cursor's own circle splits it exactly there — never a whole-element
 *    color switch based on a "dominant" or "center" sample.
 * 3. Turns each tone's sub-rectangles into a `clip-path: path(...)` string
 *    (an SVG path, but no SVG filter, no `mix-blend-mode`, no pixel
 *    reads) and applies it directly to that target's copy element for
 *    that tone — so only the pixels of the correct pre-colored copy show
 *    through, in the correct shape, at the correct place.
 *
 * Recomputation runs as a continuous per-frame loop for as long as at least
 * one target is registered — the loop starts itself the moment the first
 * target registers and stops itself once the last one unregisters, via
 * `requestChromeToneUpdate()` (see below). This is what keeps clipping in
 * sync "for free" during scrolling, cursor movement, and hover/scale
 * transitions: every one of those already changes layout continuously
 * frame-to-frame, so re-resolving tones once per frame while any of them
 * might be happening is simpler and more robust than trying to wire a
 * listener into each specific cause (scroll, resize, pointermove, a CSS
 * transition's own timeline) from every caller. The per-frame cost is a
 * handful of `getBoundingClientRect()` reads and `clip-path` writes — both
 * paint/compositing-only, no layout thrash — comparable to the GSAP ticker
 * this codebase already runs continuously for Lenis/ScrollTrigger sync (see
 * components/smooth-scroll.tsx). Callers can still call
 * `requestChromeToneUpdate()` any time they want a recompute reflected
 * sooner than "already happening every frame" — e.g. right after
 * registering, or when a region's existence just changed (the nav drawer
 * opening) — it's a cheap, safe no-op once the loop is already running.
 */

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
  /** 1 if this region carries `data-chrome-tone-overlay`, 0 otherwise —
   * see that attribute's own doc comment at `readRegions` for why this
   * exists and has to be sorted ahead of plain DOM depth. */
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

/**
 * The 0-4 axis-aligned pieces of `rect` left over once `cut` (already
 * known to overlap it) is removed — the standard "cross split" rectangle
 * subtraction: a top band, a bottom band, and left/right bands sized to
 * the cut's own vertical extent so all four pieces (when present) tile
 * back together with `cut` to exactly cover the original `rect`, with no
 * overlap between them.
 */
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

/**
 * A region can opt into automatically tracking the sitewide ambient tone —
 * the same value `app/layout.tsx`'s no-flash script and
 * `lib/theme-store.ts`'s `applyTheme()` already keep in sync on
 * `document.documentElement.dataset.chromeTone` as the light/dark theme
 * changes — instead of declaring a fixed `data-chrome-tone` of its own.
 * Mark such an element with `data-chrome-tone-follow-theme` (any value,
 * presence is all that's checked) alongside a starting `data-chrome-tone`
 * (used only until the first sync below runs, and as the safety-net value
 * if JS never runs at all).
 *
 * This exists for ordinary content pages whose background is simply
 * whatever the site theme currently is — unlike e.g. the home hero or the
 * 404 page, which are permanently black regardless of theme and tag
 * themselves with a fixed tone directly (see components/horizontal-
 * scroll.tsx and components/not-found-scene.tsx) — so a page like that can
 * participate correctly in the fixed nav chrome's light/dark resolution
 * without re-deriving "what does the current theme mean for chrome tone"
 * itself. components/page-shell.tsx (the shared wrapper for the site's
 * plain content pages — About, Resume, Art, and any future page of the
 * same kind) is the intended, and so far only, user of this: any route
 * built on it participates automatically, with no per-page wiring, and a
 * route that instead has its own fixed background can still tag a nested
 * section directly to override this for its own area (regions win by DOM
 * depth regardless of how the ancestor's own tone was arrived at).
 *
 * Deliberately kept inside this module rather than pushed out to every
 * follower page's own effect or into every theme-change call site: the
 * per-frame recompute loop already re-reads all regions continuously
 * (see the module doc above), so folding this in here means followers
 * just stay correct "for free" on the very next tick after the theme
 * changes, the same way everything else in this system does.
 */
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

/**
 * Mark a region `data-chrome-tone-overlay` when it represents something
 * that's genuinely painted on top of the rest of the page right now — not
 * a DOM descendant of the content it's covering, just visually stacked
 * above it (a fixed-position drawer/modal/sheet with its own z-index) —
 * rather than ordinary in-flow page content. Plain DOM-nesting depth (see
 * `depthOf` and the module doc above) is only a proxy for "more specific
 * region wins," and that proxy quietly breaks down for two regions that
 * AREN'T DOM ancestor/descendant of each other but happen to sit at the
 * exact same depth by coincidence: `readRegions`' sort is depth-only and
 * (being a stable sort) falls back to document order for an exact tie —
 * i.e. to whichever of the two elements happens to appear earlier in the
 * markup, which has nothing to do with which one is actually on top of
 * the screen. That's exactly what happened here: `.menu-drawer__tone-
 * band`s (six ancestors deep: html > body > .menu-container >
 * .menu-drawer > .menu-drawer__tone-bands > the band) and the home page's
 * `.hero` section (also six ancestors deep: html > body > main >
 * .horizontal-scroll > .horizontal-scroll__track > .hero) tie exactly,
 * and since components/nav.tsx's <Nav /> renders before <main> in
 * app/layout.tsx, the tone bands lost that tiebreak to `.hero` — so the
 * menu icon/logo stayed resolved to the hero's "light-on-dark" even with
 * the lime drawer open and visually covering them. Other pages didn't
 * show this because their own content doesn't happen to land on exactly
 * the same depth as the bands.
 *
 * Rather than chase exact depth numbers (fragile — the next refactor of
 * either tree could easily reintroduce or shift a coincidental tie the
 * same way this one arose), an overlay opts out of the depth-tie gamble
 * entirely: `readRegions` sorts this flag ahead of depth, so ANY region
 * marked as an overlay beats ANY ordinary page region regardless of DOM
 * nesting on either side, and only falls back to depth to order multiple
 * overlays against each other (not currently a real scenario, but a safe
 * default if one ever exists). Currently only the drawer's tone bands use
 * this; a future fixed-position overlay of the same kind should too.
 */
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
  // Overlays first regardless of depth (see the doc comment above), then
  // shallow (ambient/page-level) regions before deep ones within each of
  // those two tiers, so a more deeply-nested, more specific region still
  // paints over its own ancestor for the area they share — see
  // paintTarget below.
  regions.sort((a, b) => a.overlayPriority - b.overlayPriority || a.depth - b.depth);
  return regions;
}

/** A safety-net default for the rare case nothing tagged covers a target
 * at all (e.g. before any region has mounted). Real pages always have at
 * least the `<html>` ambient tag (see app/layout.tsx's no-flash script and
 * lib/theme-store.ts) — this only matters before that runs. */
const FALLBACK_TONE: ChromeTone = "dark-on-light";

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
    // Nothing of this tone applies anywhere in the target right now —
    // collapse this copy to a zero-area clip rather than leaving whatever
    // shape it last had.
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

function applyChromeTone(): void {
  const regions = readRegions();

  targets.forEach(({ el, copies }) => {
    const targetRect = toRect(el.getBoundingClientRect());
    if (!hasArea(targetRect)) return; // not laid out yet, or currently hidden (e.g. cursor before first move)

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
  // Keep going for as long as anything is still registered; once the last
  // target unregisters this simply stops rescheduling itself rather than
  // running a perpetual empty loop.
  rafId = targets.size > 0 ? requestAnimationFrame(tick) : null;
}

/**
 * Ensures the continuous per-frame recompute loop (see the module doc
 * above) is running — a no-op if it already is. Call this after
 * registering a target, and any time a region's existence/position might
 * have just changed outside of normal layout-affecting animation (e.g. the
 * nav drawer opening, a theme toggle) so that change is reflected on the
 * very next frame rather than whenever the loop next happens to run.
 */
export function requestChromeToneUpdate(): void {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(tick);
}

/**
 * Registers `el` (the element whose own `getBoundingClientRect()` defines
 * the area to resolve) with one pre-styled `copies[tone]` element per tone
 * it can render — each copy should be the same content/shape, positioned
 * to exactly overlap `el`, differing only in its own color/appearance for
 * that tone. Returns an unregister function; call it on unmount.
 */
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
