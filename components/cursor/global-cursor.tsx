"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import {
  getCurrentMode,
  getPointerState,
  revalidateTarget,
  subscribeToModeChange,
  updatePointerPosition,
} from "@/lib/cursor/store";
import { morphTechniqueFor, rectToPath } from "@/lib/cursor/morph-strategy";
import { getPooledMedia, pausePooledVideo, playPooledVideo } from "@/lib/cursor/media-pool";
import { getIntroPhase } from "@/lib/intro-store";
import { installCursorTargetListener } from "./cursor-target";
import type {
  CursorBlendMode,
  CursorContent,
  CursorModeConfig,
  CursorShape,
} from "@/lib/cursor/types";
import "./global-cursor.css";

const DEFAULT_TRANSITION_MS = 250;
/** Speed (px/second) treated as "fast" for `tracking.stretchWithVelocity` —
 * tuned by feel, not measured; see the architecture doc's own note that
 * this is a guess pending real content/devices to test against. */
const STRETCH_SPEED_REFERENCE = 1200;

function renderSize(shape: CursorShape): { width: number; height: number } {
  return { width: shape.width, height: shape.height };
}

/** A shape that omits `blend` entirely renders normally — see
 * `CursorBlendMode`'s own comment in lib/cursor/types.ts for why this is a
 * property of the shape, not the mode. */
function resolveBlend(shape: CursorShape): CursorBlendMode {
  return shape.blend === "difference" ? "difference" : "normal";
}

/**
 * The persistent, globally-mounted cursor shell — see
 * claude/cursor-system-architecture.md for the full design this
 * implements. Mounted once in app/layout.tsx, replacing the previous
 * simple dot cursor (components/custom-cursor.tsx, now retired).
 *
 * Three things this component deliberately does NOT do, each for a
 * specific reason spelled out in the architecture doc:
 * - It does not hold position/velocity in React state — that lives in
 *   lib/cursor/store.ts, a plain module singleton read every tick inside
 *   a GSAP ticker callback, so a `pointermove` never triggers a React
 *   re-render (§12 of the spec).
 * - It never remounts the shell/content DOM tree between modes — the
 *   "simple" shape div and the "svg" shape layer are both always present,
 *   only opacity-toggled; content swaps are sequenced through a GSAP
 *   timeline `.call()` rather than an instant React-driven replace.
 * - It never resolves *which* mode should be active itself — that's
 *   components/cursor/cursor-target.tsx's job (the delegated pointerover/
 *   pointerout listener + the public API). This component only reacts to
 *   whatever `lib/cursor/store.ts` says the current mode is.
 */
export function GlobalCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const stretchRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const contentReactRef = useRef<HTMLDivElement>(null);
  const mediaSlotRef = useRef<HTMLDivElement>(null);
  const trailSvgRef = useRef<SVGSVGElement>(null);
  const trailMidLineRef = useRef<SVGLineElement>(null);
  const trailTailLineRef = useRef<SVGLineElement>(null);

  const [mode, setMode] = useState<CursorModeConfig>(() => getCurrentMode());
  const [renderedContent, setRenderedContent] = useState<CursorContent>(
    () => getCurrentMode().content,
  );

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const prevShapeRef = useRef<CursorShape>(getCurrentMode().shape);
  const activeMediaSrcRef = useRef<string | null>(null);
  const trackRef = useRef<{ moveX: (v: number) => void; moveY: (v: number) => void } | null>(null);

  // Plain mutable position state for the trail's two chained follower
  // points — see `mode.trail`'s own doc comment in lib/cursor/types.ts for
  // why this is hand-rolled per-frame easing rather than GSAP tweens.
  // `trailActiveRef` is just "was the trail drawn last frame," so tick()
  // can tell a fresh activation (mode just switched to one with `trail`)
  // from an already-running one: only on that rising edge does it snap
  // both points to the shell's current position, so the trail always
  // grows out from zero rather than snapping in from wherever they last
  // sat (stale, possibly off-screen, if `trail` hasn't been active in a
  // while).
  const trailMidRef = useRef({ x: 0, y: 0 });
  const trailTailRef = useRef({ x: 0, y: 0 });
  const trailActiveRef = useRef(false);

  // ---- global listeners: mount once, read the LATEST mode/tracking via
  // refs rather than re-subscribing on every mode change ----
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.documentElement.classList.add("has-custom-cursor");

    // Installed here, inside the same `pointer: fine` gate this whole
    // effect is already behind, rather than unconditionally at module load
    // — a coarse-pointer/touch device should get no delegated hover
    // resolution at all, matching the rest of this effect's own gating.
    // See components/cursor/cursor-target.tsx for what this actually does;
    // this component only calls it, never resolves a mode itself (see this
    // component's own top-of-file comment).
    const uninstallTargetListener = installCursorTargetListener();

    let hasShown = false;
    let hasPositioned = false;

    const show = () => {
      root.style.opacity = "1";
      hasShown = true;
    };
    const hide = () => {
      root.style.opacity = "0";
      // Reset so the next pointermove — not just the next `mouseenter`,
      // which doesn't always fire on its own — reliably shows it again,
      // snapping straight to the real position rather than tweening in
      // from a stale one. Same lifecycle fix proven on the previous
      // cursor, carried forward verbatim.
      hasShown = false;
      hasPositioned = false;
    };

    const move = (event: PointerEvent) => {
      updatePointerPosition(event.clientX, event.clientY);
      revalidateTarget();
      // Home's opening beat (components/hero.tsx, via lib/intro-store.ts)
      // hides this cursor for its duration — without this check, moving
      // the pointer mid-intro would call show() below and reveal it early.
      // Every other route leaves the store at its "idle" default (Hero
      // never mounts there), so this is a no-op everywhere but Home.
      if (getIntroPhase() === "hidden") {
        root.style.opacity = "0";
        hasShown = false;
        hasPositioned = false;
        return;
      }
      if (!hasShown) show();
      const track = trackRef.current;
      if (prefersReducedMotion || !hasPositioned || !track) {
        gsap.set(root, { x: event.clientX, y: event.clientY });
        hasPositioned = true;
      } else {
        track.moveX(event.clientX);
        track.moveY(event.clientY);
      }
    };

    // ---- velocity-driven squash/stretch, entirely separate from the
    // shape-transition timeline below (different element, different
    // properties — see global-cursor.css's own comment on why) ----
    let appliedStretch = 0;
    const tick = () => {
      revalidateTarget();

      const root = rootRef.current;
      const stretch = stretchRef.current;

      if (!root || !stretch) return;

      const current = modeRef.current;

      // Where the visual cursor currently is after GSAP's trailing motion.
      const cursorX = Number(gsap.getProperty(root, "x"));
      const cursorY = Number(gsap.getProperty(root, "y"));

      // ---- velocity-driven squash/stretch: rotates `stretch` to face the
      // "elastic string" back toward the real pointer and stretches it
      // along that axis, proportional to how taut that string currently
      // is. Opt-in per mode via `tracking.stretchWithVelocity` — see that
      // flag's own doc comment in lib/cursor/types.ts, which always
      // described it as off-by-default ("most modes read as broken if
      // they stretch"); this `if` is the actual enforcement of that,
      // previously missing here, which is why every mode — including ones
      // like "enter" that never asked for it — was picking up a
      // directional rotate/stretch from pointer movement regardless of its
      // own `tracking` config. Only "media" (lib/cursor/modes.ts) opts in
      // today. ----
      if (current.tracking?.stretchWithVelocity) {
        const pointer = getPointerState();
        // "Elastic string" from visual cursor to real pointer.
        const dx = pointer.x - cursorX;
        const dy = pointer.y - cursorY;
        const distance = Math.hypot(dx, dy);

        // Don't update direction when the tether is essentially slack.
        if (distance > 3) {
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          gsap.set(stretch, { rotate: angle });
        }

        // Stretch based on how taut the imaginary string is.
        const maxStretch = current.tracking?.maxStretch ?? 0.15;
        const stretchAmount = Math.min(distance / 100, 1) * maxStretch;

        appliedStretch += (stretchAmount - appliedStretch) * 0.12;

        gsap.set(stretch, {
          scaleX: 1 + appliedStretch,
          scaleY: 1 - appliedStretch * 0.6,
        });
      } else if (appliedStretch !== 0) {
        // A mode without `stretchWithVelocity` just became active while
        // `stretch` was still mid-stretch from a previous one (e.g.
        // leaving "media" for "enter" mid-flick) — ease back to neutral
        // instead of freezing whatever rotate/scale the last stretchy mode
        // left behind, then stop touching this element at all once it's
        // close enough to call settled (avoids an infinite trickle of
        // `gsap.set` calls doing nothing once fully converged).
        appliedStretch += (0 - appliedStretch) * 0.12;
        if (Math.abs(appliedStretch) < 0.001) appliedStretch = 0;
        gsap.set(stretch, {
          rotate: 0,
          scaleX: 1 + appliedStretch,
          scaleY: 1 - appliedStretch * 0.6,
        });
      }

      // ---- elastic trail (`mode.trail`, e.g. the "trail" mode in
      // lib/cursor/modes.ts) — entirely separate from the squash/stretch
      // above (different element, different properties: this writes SVG
      // attributes on the two line refs, never touches `stretch`) and from
      // `cursorX`/`cursorY` computed above, which is exactly the position
      // this chain trails behind. See lib/cursor/types.ts's `trail` field
      // for why plain per-frame lerp, not GSAP tweens. ----
      const trailSvg = trailSvgRef.current;
      const midLine = trailMidLineRef.current;
      const tailLine = trailTailLineRef.current;
      const trailConfig = current.trail;

      if (trailConfig && !prefersReducedMotion && trailSvg && midLine && tailLine) {
        if (!trailActiveRef.current) {
          trailActiveRef.current = true;
          trailMidRef.current.x = cursorX;
          trailMidRef.current.y = cursorY;
          trailTailRef.current.x = cursorX;
          trailTailRef.current.y = cursorY;
          trailSvg.style.opacity = "1";
        }

        const mid = trailMidRef.current;
        const tail = trailTailRef.current;
        const midEase = trailConfig.midEase ?? 0.25;
        const tailEase = trailConfig.tailEase ?? 0.15;

        mid.x += (cursorX - mid.x) * midEase;
        mid.y += (cursorY - mid.y) * midEase;
        tail.x += (mid.x - tail.x) * tailEase;
        tail.y += (mid.y - tail.y) * tailEase;

        midLine.setAttribute("x1", String(cursorX));
        midLine.setAttribute("y1", String(cursorY));
        midLine.setAttribute("x2", String(mid.x));
        midLine.setAttribute("y2", String(mid.y));
        tailLine.setAttribute("x1", String(mid.x));
        tailLine.setAttribute("y1", String(mid.y));
        tailLine.setAttribute("x2", String(tail.x));
        tailLine.setAttribute("y2", String(tail.y));
      } else if (trailActiveRef.current) {
        trailActiveRef.current = false;
        if (trailSvg) trailSvg.style.opacity = "0";
      }
    };

    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("mouseleave", hide);
    document.documentElement.addEventListener("mouseenter", show);
    gsap.ticker.add(tick);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", hide);
      document.documentElement.removeEventListener("mouseenter", show);
      gsap.ticker.remove(tick);
      uninstallTargetListener();
    };
  }, []);

  // ---- re-tune position tracking whenever the active mode's own
  // tracking config changes (different modes follow at different
  // speeds/looseness — media mode trails softer than the default dot) ----
  //
  // Root-caused bug (the hero-circle hover snap/freeze): this effect
  // rebuilds `trackRef.current` — the pair of `gsap.quickTo` functions
  // that are the ONLY thing ever allowed to write `root`'s x/y, i.e. the
  // cursor's actual tracked position — every time `mode` changes. Mode
  // changes on every hover enter/leave over anything with `data-cursor`
  // (hero.tsx's `.hero-circle` sets `data-cursor="enter"`), resolved by
  // components/cursor/cursor-target.tsx's delegated listener calling
  // `setCursorMode`. "enter" mode's own tracking duration (0.3s, see
  // lib/cursor/modes.ts) differs from "default"'s (0.15s), so this isn't
  // a redundant rebuild most of the time — it's a real re-tune.
  //
  // The bug: `gsap.quickTo(root, "x", {...})` only PREPARES a reusable
  // tween function — it doesn't kill whatever tween is already running on
  // `root`'s `x`/`y` from the PREVIOUS mode's quickTo pair. Dropping the
  // old `{ moveX, moveY }` object (by reassigning `trackRef.current`)
  // doesn't stop the tween those old functions had already started
  // easing — GSAP tweens live independently of the JS reference used to
  // create them. If a hero-circle hover enter/leave landed while the
  // cursor was still mid-ease toward a recent pointer position (entirely
  // normal — the user is moving the mouse INTO or OUT OF the circle),
  // that old tween kept running toward its own stale target, completely
  // independently of the brand-new quickTo pair the next `pointermove`
  // would start feeding. Two tweens, both legitimately "live," racing to
  // write the same `root.x`/`root.y` — whichever rendered last on a given
  // frame won, which is exactly the reported visual: a snap to the old
  // tween's stale target, a freeze once that tween finished easing and
  // had nothing left to feed it a new target, and an instant correct jump
  // the moment the next `pointermove` call reached the new quickTo pair
  // and started actually overwriting the old, now-finished tween's value.
  // Intermittent specifically because it only manifests when a mode
  // change lands while the previous tween is still mid-flight — a fast
  // approach/departure from hero-circle, not a slow one.
  //
  // Fix: explicitly stop whatever is currently animating `root`'s x/y
  // before the next mode's quickTo pair takes over, via this effect's own
  // cleanup — which React guarantees runs before the effect's next
  // invocation (i.e. before `trackRef.current` is ever reassigned) and
  // also on unmount. `gsap.killTweensOf` leaves the element exactly at
  // its current rendered value; it does not jump or reset anything, so
  // this introduces no snap of its own — it just guarantees there is
  // never more than one tween owning `root`'s position at a time, however
  // often `mode` (and this effect) changes. This makes position-tracking
  // ownership exclusive by construction, rather than relying on timing:
  // hero-circle's visual morph (shape/color/stretch/idle-bob, all handled
  // entirely by the separate effects below, none of which ever touch
  // `root`'s x/y) can change freely without ever being able to contend
  // for `root`'s tracked position again.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const tracking = mode.tracking;
    trackRef.current = {
      moveX: gsap.quickTo(root, "x", {
        duration: tracking?.duration ?? 0.35,
        ease: tracking?.ease ?? "power3",
      }),
      moveY: gsap.quickTo(root, "y", {
        duration: tracking?.duration ?? 0.35,
        ease: tracking?.ease ?? "power3",
      }),
    };

    return () => {
      gsap.killTweensOf(root, "x,y");
    };
  }, [mode]);

  // ---- subscribe to mode changes from the store (see cursor-target.tsx
  // for what actually calls setCursorMode) ----
  useEffect(() => {
    return subscribeToModeChange((nextMode) => {
      setMode(nextMode);
    });
  }, []);

  // ---- idle motion (e.g. "enter" mode's bob, lib/cursor/modes.ts) ----
  // A small continuous animation of the shape layer for as long as the
  // active mode declares one — entirely separate from the shape-transition
  // timeline below (that one only ever plays once, on the change into or
  // out of a mode) and from the tick()/tracking motion above (those target
  // `rotate`/`scaleX`/`scaleY` and `x`/`y` on `root` respectively; this
  // tweens `y` on `stretch`, so nothing here fights either of them for the
  // same property). Runs on `stretch` — the shell/svg/content all move
  // together as one unit, which matters for any future mode that pairs a
  // bob with actual content, though every current use (`enter`) has none.
  // Rebuilt on every mode change and always killed with its `y` reset back
  // to 0 first, so switching from a bobbing mode to a non-bobbing one never
  // leaves a stray vertical offset sitting on the shell. Skipped under
  // reduced motion — same "static end state, not a slowed-down version of
  // it" rule this codebase applies everywhere else motion is ambient
  // rather than a direct response to input (see components/hero.tsx's own
  // rim-rotation gate for the same pattern).
  useEffect(() => {
    const stretch = stretchRef.current;
    const idle = mode.idleMotion;
    if (!stretch || !idle) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const amplitude = idle.amplitude ?? 4;
    const durationS = idle.durationS ?? 1.4;

    const tween = gsap.fromTo(
      stretch,
      { y: -amplitude },
      { y: amplitude, duration: durationS / 2, ease: "sine.inOut", yoyo: true, repeat: -1 },
    );

    return () => {
      tween.kill();
      gsap.set(stretch, { y: 0 });
    };
  }, [mode]);

  // ---- trail styling (colors/width): applied once per mode change,
  // separately from the per-frame geometry tick() writes above — these
  // are static for as long as a given mode is active, so there's no
  // reason to re-set them 60 times a second alongside the x1/y1/x2/y2
  // attributes that actually do change every frame. A mode with no
  // `trail` just leaves the lines at whatever they last had; harmless,
  // since tick() only ever reads/writes their geometry when `mode.trail`
  // is truthy, and their shared <svg> stays opacity:0 the rest of the
  // time regardless of stale color/geometry sitting on them underneath. ----
  useEffect(() => {
    const midLine = trailMidLineRef.current;
    const tailLine = trailTailLineRef.current;
    const trail = mode.trail;
    if (!midLine || !tailLine || !trail) return;

    const width = trail.width ?? 2;
    midLine.setAttribute("stroke", trail.midColor ?? "#0088FF");
    midLine.setAttribute("stroke-width", String(width));
    tailLine.setAttribute("stroke", trail.tailColor ?? "#FF383C");
    tailLine.setAttribute("stroke-width", String(width));
  }, [mode]);

  // ---- the shape/content transition itself: one GSAP timeline per mode
  // change, built fresh (killing any still-running one) so a rapid mode
  // change mid-transition retargets cleanly rather than queuing behind
  // the old one (see the architecture doc's transition-orchestration
  // section) ----
  useEffect(() => {
    const root = rootRef.current;
    const anchor = anchorRef.current;
    const stretch = stretchRef.current;
    const shell = shellRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const contentEl = contentReactRef.current;
    if (!root || !anchor || !stretch || !shell || !svg || !path || !contentEl) return;

    const prevShape = prevShapeRef.current;
    const nextShape = mode.shape;
    const technique = morphTechniqueFor(prevShape, nextShape);
    const durationS = (mode.transitionMs ?? DEFAULT_TRANSITION_MS) / 1000;
    const targetSize = renderSize(nextShape);

    const anchorCfg = mode.anchor ?? { x: 0.5, y: 0.5, unit: "normalized" as const };
    const isPx = anchorCfg.unit === "px";
    gsap.set(anchor, {
      xPercent: isPx ? -50 : -anchorCfg.x * 100,
      yPercent: isPx ? -50 : -anchorCfg.y * 100,
      x: isPx ? anchorCfg.x : 0,
      y: isPx ? anchorCfg.y : 0,
    });

    const tl = gsap.timeline();

    tl.to(anchor, { width: targetSize.width, height: targetSize.height, duration: durationS, ease: "power2.out" }, 0);

    const nextBlend = resolveBlend(nextShape);
    root.style.mixBlendMode = nextBlend;

    if (technique === "css") {
      // simple -> simple only (morphTechniqueFor's own contract) — no SVG
      // involved at all, the cheap path the spec explicitly asks for.
      svg.style.opacity = "0";
      shell.style.opacity = "1";
      const next = nextShape as Extract<CursorShape, { kind: "simple" }>;
      tl.to(
        shell,
        {
          borderRadius: next.radius,
          backgroundColor: mode.color ?? "transparent",
          borderColor: mode.stroke?.color ?? "transparent",
          borderWidth: mode.stroke?.width ?? 0,
          rotate: next.rotate ?? 0,
          skewX: next.skewX ?? 0,
          duration: durationS,
          ease: "power2.out",
        },
        0,
      );

    } else {
      // simple<->svg or svg<->svg — bridge through the shared 100x100
      // morph space (see lib/cursor/morph-strategy.ts).
      const fromPath = prevShape.kind === "svg" ? prevShape.path : rectToPath(prevShape).path;
      const toPath = nextShape.kind === "svg" ? nextShape.path : rectToPath(nextShape).path;
      const viewBox = nextShape.kind === "svg" ? nextShape.viewBox : "0 0 100 100";

      svg.setAttribute("viewBox", viewBox);
      // The path is already about to start morphing away from this exact
      // geometry over the next `durationS` seconds, so applying the
      // *next* shape's blend mode here (rather than waiting for some
      // later point) lands on a moment that's already in fast visible
      // motion — a discrete flip is far less noticeable riding along with
      // continuous geometry change than it would be against a static
      // shape. (Unlike the "css" branch above, this path is visible
      // throughout the whole bridge, so there's no natural fully-invisible
      // instant to hide behind — this is the deliberately-chosen "good
      // enough" stable point for this branch instead.)
      gsap.set(path, {
        attr: { d: fromPath },
      });
      svg.style.opacity = "1";

      if (prevShape.kind === "simple") {
        tl.to(shell, { opacity: 0, duration: 0.1 }, 0);
      }

      tl.to(
        path,
        { morphSVG: toPath, fill: mode.color ?? "currentColor", duration: durationS, ease: "power2.inOut" },
        0,
      );

      if (nextShape.kind === "simple") {
        const next = nextShape;
        // `shell` is at opacity 0 here (either just faded out above, or
        // already 0 from a previous svg-only mode) and is about to fade
        // back in immediately below — exactly the kind of invisible
        // moment the "css" branch above has to manufacture on purpose, so
        // setting `mixBlendMode` in this same `.set()` costs nothing extra.
        tl.set(shell, {
          borderRadius: next.radius,
          backgroundColor: mode.color ?? "transparent",
          borderColor: mode.stroke?.color ?? "transparent",
          borderWidth: mode.stroke?.width ?? 0,
          rotate: next.rotate ?? 0,
          skewX: next.skewX ?? 0,
        });
        tl.to(shell, { opacity: 1, duration: 0.12 }, `-=0.1`);
        tl.to(svg, { opacity: 0, duration: 0.12 }, "<");
      }
    }

    // ---- content: fades the currently-rendered content out, swaps the
    // React-rendered DOM at that (now-invisible) moment via a timeline
    // `.call()`, then fades the new content in once the shell has mostly
    // finished resizing — independent easing/timing from the shell itself,
    // per the spec's own requirement that content animate on its own. ----
    tl.to(contentEl, { opacity: 0, duration: 0.12 }, 0);
    tl.call(() => setRenderedContent(mode.content), undefined, 0.12);
    tl.to(contentEl, { opacity: 1, duration: 0.15 }, Math.max(0.13, durationS * 0.6));

    prevShapeRef.current = nextShape;

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---- media pool wiring: reacts to *rendered* content (post-swap), not
  // the target mode (pre-swap) — see the effect above for why those are
  // two different points in time. ----
  useEffect(() => {
    const slot = mediaSlotRef.current;
    if (!slot) return;

    if (activeMediaSrcRef.current) {
      pausePooledVideo(activeMediaSrcRef.current);
      activeMediaSrcRef.current = null;
    }
    slot.replaceChildren();

    if (renderedContent.kind === "media" && renderedContent.src) {
      const el = getPooledMedia(renderedContent.src, renderedContent.mediaKind);
      // onerror fallback (spec §15: "media load failure, unavailable
      // preview") — degrade to an empty shell rather than a broken-image
      // glyph riding around with the pointer.
      el.onerror = () => {
        slot.replaceChildren();
      };
      slot.appendChild(el);
      if (renderedContent.mediaKind === "video") {
        playPooledVideo(renderedContent.src);
        activeMediaSrcRef.current = renderedContent.src;
      }
    }

    return () => {
      if (activeMediaSrcRef.current) pausePooledVideo(activeMediaSrcRef.current);
    };
  }, [renderedContent]);

  return (
    <>
      {/* Rendered before .cursor-root, not nested inside it: the trail's
          two points live in raw viewport (clientX/clientY) coordinates,
          not `root`'s own translated space, so it needs its own fixed,
          full-viewport box rather than inheriting root's transform. Coming
          first in the DOM also means it paints underneath the shell below
          it in the same stacking context — the dot always reads as
          "leading," the trail tucking in behind it — without needing an
          explicit z-index fight between the two. See lib/cursor/types.ts's
          `trail` field and this file's own tick() for how the geometry is
          actually driven; opacity is the only thing toggled outside tick(). */}
      <svg ref={trailSvgRef} className="cursor-trail" aria-hidden="true">
        <line ref={trailMidLineRef} strokeLinecap="round" />
        <line ref={trailTailLineRef} strokeLinecap="round" />
      </svg>
      <div ref={rootRef} className="cursor-root" aria-hidden="true">
        <div ref={anchorRef} className="cursor-anchor">
          <div ref={stretchRef} className="cursor-stretch">
            <div ref={shellRef} className="cursor-shell" />
            <svg ref={svgRef} className="cursor-shell__svg" style={{ opacity: 0 }}>
              <path ref={pathRef} />
            </svg>
            <div className="cursor-content">
              <div ref={contentReactRef} className="cursor-content__react">
                {renderedContent.kind === "text" &&
                  (renderedContent.animation === "marquee" ? (
                    <div className="cursor-content__marquee">
                      <span>{renderedContent.text}</span>
                      <span aria-hidden="true">{renderedContent.text}</span>
                    </div>
                  ) : (
                    <span>{renderedContent.text}</span>
                  ))}
                {renderedContent.kind === "icon" && <span>{renderedContent.name}</span>}
                {renderedContent.kind === "custom" && renderedContent.render()}
              </div>
              <div ref={mediaSlotRef} className="cursor-content__media" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
