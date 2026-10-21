"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { ScrollPoint } from "@/lib/scroll-bound";
import "./stage.css";

// ---------------------------------------------------------------------------
// <Stage> + <Place> — free-form layout for the horizontal home page.
//
// A <Stage> is one long, empty canvas inside <HorizontalScroll> (instead of
// a fixed 100vw panel). Its `length` is how much horizontal room — and,
// since the pin scrubs 1 scroll px → 1 track px, how much SCROLL — it takes.
// Anything inside it is positioned explicitly with <Place>:
//
//   <Stage length="400vw">
//     <Place x="20vw" y="15vh" w="30rem">…</Place>              canvas coords
//     <Place at="225vh" w="34rem">…</Place>                        scroll moment
//     <Place x="60vw" y="40vh" w="20rem" z={2} anchor="center">…</Place>
//   </Stage>
//
// Two ways to say WHERE, per element:
//   x / y  — canvas coordinates, measured from the Stage's own top-left.
//   at     — "be centered on screen when the page has scrolled this far"
//            (absolute window.scrollY, same units as FrostPanel's
//            enter/exit and the speech bubbles' ranges). Lets you line an
//            element's position up with its own animation timing using one
//            number. `y` still sets the vertical position.
//
// On phones / reduced motion (no horizontal scroll) a Stage is a plain
// vertical stack: every Place falls back to normal flow in source order,
// sized by `w` (capped to the screen), with optional `mobile` overrides.
// x / y / at / z / anchor only apply in the desktop horizontal mode.
//
// Pure CSS positioning (custom properties → absolute position), so there's
// no layout JS per element and no flash of unpositioned content. The only JS
// is the Stage measuring its own offset in the track (needed for `at`),
// once, plus on resize via a ResizeObserver.
// ---------------------------------------------------------------------------

/** Any CSS length (`"30vw"`, `"12rem"`, `"calc(50vw - 10rem)"`), or px. */
export type Length = number | string;

/** Which point of the element sits at its (x, y) / at position. */
export type PlaceAnchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

const ANCHORS: Record<PlaceAnchor, [number, number]> = {
  "top-left": [0, 0],
  top: [0.5, 0],
  "top-right": [1, 0],
  left: [0, 0.5],
  center: [0.5, 0.5],
  right: [1, 0.5],
  "bottom-left": [0, 1],
  bottom: [0.5, 1],
  "bottom-right": [1, 1],
};

const css = (v: Length | undefined) =>
  v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;

// ---- Stage ----------------------------------------------------------------

type StageProps = HTMLAttributes<HTMLElement> & {
  /** Horizontal length of the canvas (and so the scroll it consumes).
   * Anything you place past the end is still visible but won't extend the
   * scroll — make the Stage longer instead. Default: one screen. */
  length?: Length;
  children?: ReactNode;
};

export function Stage({ length = "100vw", className, style, children, ...rest }: StageProps) {
  const ref = useRef<HTMLElement>(null);

  // `at` placements need to know where this Stage starts within the
  // horizontal track (e.g. after the 100vw Hero). Measured as a difference
  // of two rects, so the track's own scroll translation cancels out; kept
  // fresh with a ResizeObserver on the track (earlier panels' widths change
  // with the viewport). Layout effect → written before first paint.
  useLayoutEffect(() => {
    const stage = ref.current;
    const track = stage?.parentElement;
    if (!stage || !track) return;
    const measure = () => {
      const offset = stage.getBoundingClientRect().left - track.getBoundingClientRect().left;
      stage.style.setProperty("--stage-offset", `${offset}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={className ? `stage ${className}` : "stage"}
      style={{ "--stage-length": css(length), ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </section>
  );
}

// ---- Place ----------------------------------------------------------------

/** Lets components inside a <Place> know its scroll moment (FrostPanel
 * uses it as its parallax anchor, so parallax offset is zero exactly when
 * the element is centered). */
const PlaceContext = createContext<{ at?: ScrollPoint }>({});
export const usePlace = () => useContext(PlaceContext);

type PlaceProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** Canvas x (from the Stage's left edge). Ignored if `at` is set. */
  x?: Length;
  /** Scroll position (px, "225vh", "150vw") at which this is centered on
   * screen. Takes precedence over `x`. */
  at?: Exclude<ScrollPoint, () => number>;
  /** Canvas y (from the Stage's top; the Stage is one screen tall). */
  y?: Length;
  w?: Length;
  h?: Length;
  /** Stacking order among overlapping Places. */
  z?: number;
  /** Which point of the element sits at (x, y). Default: "top-left" with
   * `x`, "center" with `at`. */
  anchor?: PlaceAnchor;
  /** Phone / reduced-motion layout (vertical stack) overrides. */
  mobile?: {
    /** CSS `order` within the stack (default: source order). */
    order?: number;
    /** Horizontal alignment in the stack. Default "center". */
    align?: "start" | "center" | "end" | "stretch";
    /** Width in the stack (default: `w`, capped at 100%). */
    w?: Length;
    /** Leave this element out of the mobile layout entirely. */
    hidden?: boolean;
  };
  children?: ReactNode;
};

export function Place({
  x,
  at,
  y,
  w,
  h,
  z,
  anchor,
  mobile,
  className,
  style,
  children,
  ...rest
}: PlaceProps) {
  const [ax, ay] = ANCHORS[anchor ?? (at !== undefined ? "center" : "top-left")];
  const left =
    at !== undefined
      ? // centered on screen at scroll `at`: track moves left 1px per
        // scroll px, so screen-center at `at` is canvas x =
        // at + 50vw - (where this Stage starts in the track).
        `calc(${css(at)} + 50vw - var(--stage-offset, 0px))`
      : (css(x) ?? "0px");
  const top = css(y) ?? (at !== undefined ? "50vh" : "0px");

  const vars = {
    "--place-left": left,
    "--place-top": top,
    "--place-w": css(w),
    "--place-h": css(h),
    "--place-z": z,
    "--place-ax": ax,
    "--place-ay": ay,
    "--place-m-order": mobile?.order,
    "--place-m-align": mobile?.align,
    "--place-m-w": css(mobile?.w),
    ...style,
  } as CSSProperties;

  return (
    <PlaceContext.Provider value={{ at }}>
      <div
        className={className ? `place ${className}` : "place"}
        data-mobile-hidden={mobile?.hidden ? "" : undefined}
        style={vars}
        {...rest}
      >
        {children}
      </div>
    </PlaceContext.Provider>
  );
}
