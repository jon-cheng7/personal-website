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
      const pointer = getPointerState();

      // Where the visual cursor currently is after GSAP's trailing motion.
      const cursorX = Number(gsap.getProperty(root, "x"));
      const cursorY = Number(gsap.getProperty(root, "y"));

      // "Elastic string" from visual cursor to real pointer.
      const dx = pointer.x - cursorX;
      const dy = pointer.y - cursorY;

      const distance = Math.hypot(dx, dy);

      // Don't update direction when the tether is essentially slack.
      if (distance > 3) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        gsap.set(stretch, {
          rotate: angle,
        });
      }

      // Stretch based on how taut the imaginary string is.
      const maxStretch = current.tracking?.maxStretch ?? 0.15;
      const stretchAmount = Math.min(distance / 100, 1) * maxStretch;

      appliedStretch += (stretchAmount - appliedStretch) * 0.12;

      gsap.set(stretch, {
        scaleX: 1 + appliedStretch,
        scaleY: 1 - appliedStretch * 0.6,
      });
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
  }, [mode]);

  // ---- subscribe to mode changes from the store (see cursor-target.tsx
  // for what actually calls setCursorMode) ----
  useEffect(() => {
    return subscribeToModeChange((nextMode) => {
      setMode(nextMode);
    });
  }, []);

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
  );
}
