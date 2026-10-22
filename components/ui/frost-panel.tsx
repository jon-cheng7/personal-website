"use client";

// Rounded card for text: size, colors, fill opacity, optional glass blur + cursor hover light. Look only.
// shimmer = fluid WebGL blob (lib/shimmer-gl, one shared context); CSS fallback if no WebGL / reduced motion.
// Fits: reusable; to move/frost on scroll wrap in <Actor> and keyframe it.

import {
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { gsap } from "@/lib/gsap";
import { shimmerDetach, shimmerEnter, shimmerLeave, shimmerMove } from "@/lib/shimmer-gl";
import type { Length } from "@/components/choreo/units";
import "./frost-panel.css";

/** Cursor light: "glow" | "shimmer" (fluid iridescent) | false (off, zero cost). */
export type FrostHover = false | "glow" | "shimmer";

/** Each prop → a --frost-panel-* CSS var (class can set them too; props win). */
export type FrostLook = {
  width?: Length;
  height?: Length;
  padding?: Length;
  radius?: Length;
  background?: string;
  /** Fill only; text stays solid. */
  backgroundOpacity?: number;
  color?: string;
  /** false = no border. */
  borderColor?: string | false;
  borderWidth?: Length;
  /** Backdrop blur px. Costly; opt-in. */
  glass?: number;
  hover?: FrostHover;
  hoverColor?: string;
  /** Light diameter; shimmer blob radius ≈ 0.3×. */
  hoverSize?: Length;
  /** glow: light opacity. shimmer: × SHIMMER_GAIN. */
  hoverIntensity?: number;
  /** Shimmer palette, 1–5 hex colours (cycled). */
  shimmerColors?: string[];
  /** Seconds the light trails the cursor. */
  hoverLag?: number;
};

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children" | "color"> &
  FrostLook & {
    children?: ReactNode;
  };

export function FrostPanel({
  children,
  width,
  height,
  padding,
  radius,
  background,
  backgroundOpacity,
  color,
  borderColor,
  borderWidth,
  glass,
  hover = false,
  hoverColor,
  hoverSize,
  hoverIntensity,
  hoverLag = 0.35,
  shimmerColors,
  className,
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverLight(ref, hover, hoverLag, shimmerColors?.join(",") ?? DEFAULT_SHIMMER);

  const px = (v: Length | undefined) =>
    v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;
  const vars = {
    "--frost-panel-width": px(width),
    "--frost-panel-height": px(height),
    "--frost-panel-pad": px(padding),
    "--frost-panel-radius": px(radius),
    "--frost-panel-bg": background,
    "--frost-panel-bg-opacity": backgroundOpacity,
    "--frost-panel-fg": color,
    "--frost-panel-border-color": borderColor === false ? "transparent" : borderColor,
    "--frost-panel-border-width": borderColor === false ? "0px" : px(borderWidth),
    "--frost-panel-glass": glass !== undefined ? `${glass}px` : undefined,
    "--frost-panel-glow-color": hoverColor,
    "--frost-panel-glow-size": px(hoverSize),
    "--frost-panel-glow-intensity": hoverIntensity,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={className ? `frost-panel ${className}` : "frost-panel"}
      data-glass={glass ? "" : undefined}
      data-hover-fx={hover || undefined}
      style={vars}
      {...rest}
    >
      {hover && (
        <>
          <span className="frost-panel__fx" aria-hidden="true">
            <span className="frost-panel__light">
              <span className="frost-panel__light-color" />
            </span>
          </span>
          <span className="frost-panel__edge" aria-hidden="true">
            <span className="frost-panel__light">
              <span className="frost-panel__light-color" />
            </span>
          </span>
        </>
      )}
      <div className="frost-panel__content">{children}</div>
    </div>
  );
}

const DEFAULT_SHIMMER = "#c5fb45,#45f0fb,#8b7bff,#ff7bd8,#ffd36b";
/** Shimmer alpha = hoverIntensity (default 0.18) × this. */
const SHIMMER_GAIN = 2.5;

/** Cursor light: listeners only while hovered; transform-only movement. colors = comma list (stable dep). */
function useHoverLight(
  ref: RefObject<HTMLDivElement | null>,
  hover: FrostHover,
  lag: number,
  colors: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !hover) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fluid = hover === "shimmer" && !reduce;
    if (fluid) el.dataset.shimmerGl = "";
    const fx = el.querySelector<HTMLElement>(".frost-panel__fx");
    // fluid: fill = canvas, CSS lights only on the edge
    const lights = Array.from(
      el.querySelectorAll<HTMLElement>(fluid ? ".frost-panel__edge .frost-panel__light" : ".frost-panel__light"),
    );
    if (lights.length === 0) return;
    const duration = reduce ? 0 : lag;
    const movers = lights.map((l) => ({
      x: gsap.quickTo(l, "x", { duration, ease: "power3.out" }),
      y: gsap.quickTo(l, "y", { duration, ease: "power3.out" }),
    }));

    let rect: DOMRect | null = null;
    let clientX = 0;
    let clientY = 0;
    let raf = 0;

    const update = () => {
      raf = 0;
      rect ??= el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      for (const m of movers) {
        m.x(x);
        m.y(y);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onMove = (e: PointerEvent) => {
      clientX = e.clientX;
      clientY = e.clientY;
      if (el.dataset.shimmerGl !== undefined) shimmerMove(el, clientX, clientY);
      schedule();
    };
    const onScroll = () => {
      rect = null;
      schedule();
    };
    const onEnter = (e: PointerEvent) => {
      rect = el.getBoundingClientRect();
      clientX = e.clientX;
      clientY = e.clientY;
      gsap.set(lights, { x: clientX - rect.left, y: clientY - rect.top });
      for (const m of movers) {
        m.x(clientX - rect.left, clientX - rect.left);
        m.y(clientY - rect.top, clientY - rect.top);
      }
      if (el.dataset.shimmerGl !== undefined && fx) {
        const size = fx.querySelector<HTMLElement>(".frost-panel__light")?.offsetWidth || 416;
        const intensity = parseFloat(getComputedStyle(el).getPropertyValue("--frost-panel-glow-intensity")) || 0.18;
        const ok = shimmerEnter(el, fx, { colors: colors.split(","), intensity: intensity * SHIMMER_GAIN, radius: size * 0.3 }, clientX, clientY);
        if (!ok) delete el.dataset.shimmerGl;
      }
      el.dataset.hovered = "";
      el.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
    };
    const onLeave = () => {
      delete el.dataset.hovered;
      shimmerLeave(el);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      raf = 0;
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      onLeave();
      shimmerDetach(el);
      delete el.dataset.shimmerGl;
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(lights);
    };
  }, [ref, hover, lag, colors]);
}
