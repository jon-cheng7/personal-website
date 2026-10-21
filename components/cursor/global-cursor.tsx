"use client";

// The custom cursor: one persistent DOM tree, morphs between modes.
// Fits: mounted once in layout. Modes: lib/cursor/modes.ts; targets: cursor-target.tsx.

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

/** Mode transition default. */
const DEFAULT_TRANSITION_MS = 250;
/** px/s treated as "fast" for velocity stretch. */
const STRETCH_SPEED_REFERENCE = 1200;

/** Shape → rendered px size. */
function renderSize(shape: CursorShape): { width: number; height: number } {
  return { width: shape.width, height: shape.height };
}

/** Shape blend mode → CSS mix-blend-mode. */
function resolveBlend(shape: CursorShape): CursorBlendMode {
  return shape.blend === "difference" ? "difference" : "normal";
}

/** Fine pointers only. Position via GSAP ticker; mode changes via store subscription. */
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

  const trailMidRef = useRef({ x: 0, y: 0 });
  const trailTailRef = useRef({ x: 0, y: 0 });
  const trailActiveRef = useRef(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.documentElement.classList.add("has-custom-cursor");

    const uninstallTargetListener = installCursorTargetListener();

    let hasShown = false;
    let hasPositioned = false;

    const show = () => {
      root.style.opacity = "1";
      hasShown = true;
    };
    const hide = () => {
      root.style.opacity = "0";
      hasShown = false;
      hasPositioned = false;
    };

    const move = (event: PointerEvent) => {
      updatePointerPosition(event.clientX, event.clientY);
      revalidateTarget();
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

    let appliedStretch = 0;
    const tick = () => {
      revalidateTarget();

      const root = rootRef.current;
      const stretch = stretchRef.current;

      if (!root || !stretch) return;

      const current = modeRef.current;

      const cursorX = Number(gsap.getProperty(root, "x"));
      const cursorY = Number(gsap.getProperty(root, "y"));

      if (current.tracking?.stretchWithVelocity) {
        const pointer = getPointerState();
        const dx = pointer.x - cursorX;
        const dy = pointer.y - cursorY;
        const distance = Math.hypot(dx, dy);

        if (distance > 3) {
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          gsap.set(stretch, { rotate: angle });
        }

        const maxStretch = current.tracking?.maxStretch ?? 0.15;
        const stretchAmount = Math.min(distance / 100, 1) * maxStretch;

        appliedStretch += (stretchAmount - appliedStretch) * 0.12;

        gsap.set(stretch, {
          scaleX: 1 + appliedStretch,
          scaleY: 1 - appliedStretch * 0.6,
        });
      } else if (appliedStretch !== 0) {
        appliedStretch += (0 - appliedStretch) * 0.12;
        if (Math.abs(appliedStretch) < 0.001) appliedStretch = 0;
        gsap.set(stretch, {
          rotate: 0,
          scaleX: 1 + appliedStretch,
          scaleY: 1 - appliedStretch * 0.6,
        });
      }

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

  useEffect(() => {
    return subscribeToModeChange((nextMode) => {
      setMode(nextMode);
    });
  }, []);

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
      const fromPath = prevShape.kind === "svg" ? prevShape.path : rectToPath(prevShape).path;
      const toPath = nextShape.kind === "svg" ? nextShape.path : rectToPath(nextShape).path;
      const viewBox = nextShape.kind === "svg" ? nextShape.viewBox : "0 0 100 100";

      svg.setAttribute("viewBox", viewBox);
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

    tl.to(contentEl, { opacity: 0, duration: 0.12 }, 0);
    tl.call(() => setRenderedContent(mode.content), undefined, 0.12);
    tl.to(contentEl, { opacity: 1, duration: 0.15 }, Math.max(0.13, durationS * 0.6));

    prevShapeRef.current = nextShape;

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
