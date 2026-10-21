"use client";

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { resolveScrollPoint, type ScrollPoint } from "@/lib/scroll-bound";
import { usePlace, type PlaceAnchor } from "@/components/stage";
import "./scroll-motion.css";

// ---------------------------------------------------------------------------
// <ScrollMotion> — wrap ANY element to give it scroll-driven motion on the
// horizontal home page:
//
//   scroll ──enter.start──enter.end──lock.start═══════lock.end──exit.start──exit.end──▶
//   motion     drifts (parallax.in)       HELD still on screen     drifts (parallax.out)
//   look       enter.look → normal                                  normal → exit.look
//
//   <ScrollMotion
//     enter={{ start: "40vh", end: "110vh", look: { opacity: 0, blur: 30 } }}
//     lock={{ start: "130vh", end: "310vh", x: "30vw", y: "50vh", align: "left" }}
//     exit={{ start: "320vh", end: "390vh" }}
//     parallax={{ in: 0.5, out: 0.5 }}
//   >
//     <anything />
//   </ScrollMotion>
//
// Every prop is optional and every range is a scroll position (px, "175vh",
// "50vw" — lib/scroll-bound.ts), so ScrollMotion can be used from Server
// Components (app/page.tsx) as well as client ones (components/hero.tsx).
//
// PARALLAX: `in` / `out` = fraction of the page's speed the element moves at
// before / after the lock (1 = with the page, 0 = stuck to the screen).
// `anchor` = the scroll position at which the element sits exactly where
// its layout puts it. Default: lock.start if there's a lock, else the
// enclosing <Place at>, else the start of the page (so something visible at
// load, like the hero portrait, starts at rest).
//
// LOCK: held perfectly still on screen. Where: `lock.x` / `lock.y` (screen
// position) + `lock.align` (which point of THIS WRAPPER's box sits there —
// so make the wrapper hug the element), or omit x/y to hold it wherever it
// happens to be when the lock starts. The page itself keeps scrolling
// underneath (other content in that stretch keeps sliding) — the element
// counter-moves by exactly the track's rendered x each frame, which is what
// makes it pixel-stable.
//
// `onScroll(s)` (client code only): called every frame the track moves with
// the track's effective scroll position — e.g. RevealText lights its words
// from it, so its timing is locked to the exact same number.
//
// Phones / reduced motion: does nothing (element renders in normal layout,
// fully visible). onScroll isn't called there.
//
// Performance: one gsap.ticker callback per instance that returns
// immediately unless the track moved; writes transform/opacity/filter only
// when the value changes; blur + `will-change: filter` only while mid
// enter/exit; geometry measured only on ScrollTrigger refresh (resize).
// ---------------------------------------------------------------------------

export type MotionRange = { start: ScrollPoint; end: ScrollPoint };

/** Visual state at the far end of an entrance / exit. "Normal" is
 * opacity 1, no blur, no offset, scale 1. */
export type MotionLook = {
  opacity?: number;
  /** px */
  blur?: number;
  /** px offsets on top of the parallax / lock motion */
  x?: number;
  y?: number;
  scale?: number;
};

export type MotionPhase = MotionRange & {
  /** Default: the portrait frost — `{ opacity: 0, blur: 30 }`. */
  look?: MotionLook;
  /** Any GSAP ease name, across the range. Default "none". */
  ease?: string;
};

/** A position on SCREEN: px, or "40vw" / "30vh" / "25%" (% = of the
 * viewport's width for x, height for y). */
export type ScreenLength = number | `${number}${"px" | "vw" | "vh" | "%"}`;

export type MotionLock = MotionRange & {
  x?: ScreenLength;
  y?: ScreenLength;
  /** Which point of the wrapper sits at (x, y). Default "center". */
  align?: PlaceAnchor;
};

export type MotionParallax = {
  /** Speed (fraction of the page's) before the lock. Default 1. */
  in?: number;
  /** Speed after the lock. Default = `in`. */
  out?: number;
  /** Scroll position where the element sits at its layout position. */
  anchor?: ScrollPoint;
};

export type ScrollMotionProps = Omit<HTMLAttributes<HTMLDivElement>, "onScroll"> & {
  enter?: MotionPhase;
  lock?: MotionLock;
  exit?: MotionPhase;
  parallax?: MotionParallax;
  /** How the motion eases against the scroll, in seconds (same scale as a
   * GSAP `scrub`). `stop` = how long it glides on after you stop
   * scrolling; `start` = how sluggishly it picks up when you start
   * (smaller = more responsive). A single number sets both (symmetric, the
   * original portrait feel at 2.5). 0 = glued to the page.
   * Default `{ start: 0.6, stop: 2.5 }`. The lock stays pixel-still
   * regardless (see the tick below). */
  smoothing?: Smoothing;
  /** Per-frame (smoothed) scroll position (client components only). */
  onScroll?: (scroll: number) => void;
  children?: ReactNode;
};

export type Smoothing = number | { start: number; stop: number };

const DEFAULT_SMOOTHING: Smoothing = { start: 0.6, stop: 2.5 };

const DEFAULT_LOOK: Required<MotionLook> = { opacity: 0, blur: 30, x: 0, y: 0, scale: 1 };
const DESKTOP = "(min-width: 901px) and (prefers-reduced-motion: no-preference)";

const ALIGN: Record<PlaceAnchor, [number, number]> = {
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

const clamp01 = gsap.utils.clamp(0, 1);

const resolveScreen = (v: ScreenLength, axis: "x" | "y") => {
  if (typeof v === "number") return v;
  const n = parseFloat(v);
  if (v.endsWith("vw")) return (n / 100) * window.innerWidth;
  if (v.endsWith("vh")) return (n / 100) * window.innerHeight;
  if (v.endsWith("%")) return (n / 100) * (axis === "x" ? window.innerWidth : window.innerHeight);
  return n;
};

export function ScrollMotion({
  enter,
  lock,
  exit,
  parallax,
  smoothing = DEFAULT_SMOOTHING,
  onScroll,
  className,
  children,
  ...rest
}: ScrollMotionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const placeAt = usePlace().at;
  // Latest callback without re-running the setup when its identity changes.
  const onScrollRef = useRef(onScroll);
  useLayoutEffect(() => {
    onScrollRef.current = onScroll;
  });

  const configKey = JSON.stringify([enter, lock, exit, parallax, smoothing, placeAt], (_, v) =>
    typeof v === "function" ? String(v) : v,
  );

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(DESKTOP, () => {
        let teardown: (() => void) | null = null;
        // One frame late: the parent <HorizontalScroll> creates its pin in
        // its own layout effect, which runs after this child's.
        const raf = requestAnimationFrame(() => {
          teardown = setup(root);
        });
        return () => {
          cancelAnimationFrame(raf);
          teardown?.();
        };
      });

      function setup(root: HTMLDivElement) {
        const section = root.closest<HTMLElement>(".horizontal-scroll");
        const track = root.closest<HTMLElement>(".horizontal-scroll__track");
        const pin = section
          ? ScrollTrigger.getAll().find((st) => st.trigger === section && st.pin)
          : undefined;
        if (!track || !pin) return () => {};

        const fIn = parallax?.in ?? 1;
        const fOut = parallax?.out ?? fIn;
        const enterLook = { ...DEFAULT_LOOK, ...enter?.look };
        const exitLook = { ...DEFAULT_LOOK, ...exit?.look };
        const enterEase = gsap.parseEase(enter?.ease ?? "none");
        const exitEase = gsap.parseEase(exit?.ease ?? "none");

        let b = { eS: 0, eE: 0, xS: 0, xE: 0, lS: 0, lE: 0, A: 0, cx: 0, cy: 0 };
        let curX = 0; // own translate currently applied
        let curY = 0;
        let lastS = NaN;
        let lastSigma = NaN;
        // σ = s − lag: a smoothed scroll position. The lag eases toward
        // `velocity × glide` — it BUILDS slowly while you scroll (time
        // constant tUp: the bigger, the more responsive the start, since σ
        // initially moves 1:1 with the page) and RELEASES with time
        // constant tDown when you slow down/stop (the glide). With
        // tUp == tDown this is exactly a plain exponential follow, i.e. the
        // old symmetric scrub feel. "seconds" are scrub-like durations;
        // an exponential settles ~98% in 4 time constants, hence the / 4.
        const sm =
          typeof smoothing === "number"
            ? { start: smoothing, stop: smoothing }
            : smoothing;
        const smoothingOn = sm.stop > 0;
        const glide = sm.stop / 4; // seconds of velocity carried as lag
        const tDown = glide;
        const tUp = smoothingOn ? glide * (sm.stop / Math.max(sm.start, 0.05)) : 0;
        let lag = 0;
        let prevS = NaN;

        // Accumulated counter-motion from scroll 0 to s: the element cancels
        // (1 - speed) of the track's motion — 1 - in before the lock, all of
        // it (held still) during, 1 - out after. Piecewise linear, so the
        // motion is continuous through both lock edges.
        const G = (s: number) =>
          (1 - fIn) * Math.min(s, b.lS) +
          (Math.min(Math.max(s, b.lS), b.lE) - b.lS) +
          (1 - fOut) * Math.max(0, s - b.lE);
        const xAt = (s: number) => b.cx + G(s) - G(b.A);

        const resolveAll = () => {
          const r = (p: ScrollPoint | undefined, d: number) =>
            p === undefined ? d : resolveScrollPoint(p);
          const anchorDefault = lock
            ? resolveScrollPoint(lock.start)
            : placeAt !== undefined
              ? resolveScrollPoint(placeAt)
              : pin.start;
          const A = r(parallax?.anchor, anchorDefault);
          // No lock → split in/out speeds at the anchor.
          const lS = lock ? resolveScrollPoint(lock.start) : A;
          const lE = lock ? resolveScrollPoint(lock.end) : A;
          b = {
            eS: r(enter?.start, -Infinity),
            eE: r(enter?.end, -Infinity),
            xS: r(exit?.start, Infinity),
            xE: r(exit?.end, Infinity),
            lS,
            lE,
            A,
            cx: 0,
            cy: 0,
          };

          if (lock && (lock.x !== undefined || lock.y !== undefined)) {
            const [ax, ay] = ALIGN[lock.align ?? "center"];
            const rect = root.getBoundingClientRect();
            const trackLeft = track.getBoundingClientRect().left;
            // Layout box, own transforms excluded (offsetWidth/Height
            // ignore scale; a centered scale doesn't move the center).
            const w = root.offsetWidth;
            const h = root.offsetHeight;
            const centerTrackX = rect.left + rect.width / 2 - curX - trackLeft;
            const centerY = rect.top + rect.height / 2 - curY;
            // Where the chosen point would be at lock.start with no
            // offset: the track has moved (lS - pin.start) by then, and the
            // parallax has added G(lS) - G(A).
            const pointX =
              centerTrackX - (lS - pin.start) + (ax - 0.5) * w + (G(lS) - G(A));
            const pointY = centerY + (ay - 0.5) * h;
            if (lock.x !== undefined) b.cx = resolveScreen(lock.x, "x") - pointX;
            if (lock.y !== undefined) b.cy = resolveScreen(lock.y, "y") - pointY;
          }
          lastS = NaN; // force a redraw
        };

        const phase = (s: number, start: number, end: number) =>
          end > start ? clamp01((s - start) / (end - start)) : s >= end ? 1 : 0;

        let lastTransform = "";
        let lastOpacity = "";
        let lastFilter = "";

        const tick = (_time?: number, deltaMs?: number) => {
          const tx = (gsap.getProperty(track, "x") as number) || 0;
          const s = pin.start - tx; // the track's own (scrubbed) scroll
          if (smoothingOn) {
            const dt = Math.min((deltaMs ?? 0) / 1000, 0.1);
            const ds = Number.isNaN(prevS) ? 0 : s - prevS;
            prevS = s;
            if (Math.abs(ds) > window.innerWidth) {
              lag = 0; // a jump (resize / restored scroll), not a scroll
            } else if (dt > 0) {
              const target = (ds / dt) * glide;
              const tau = Math.abs(target) > Math.abs(lag) ? tUp : tDown;
              lag += (target - lag) * (1 - Math.exp(-dt / tau));
              if (Math.abs(lag) < 0.01 && ds === 0) lag = 0;
            }
          }
          const sigma = s - lag;
          // Nothing moved and nothing still easing → nothing to do.
          if (s === lastS && sigma === lastSigma) return;
          lastS = s;
          lastSigma = sigma;

          // k: 0 = normal, 1 = fully at the enter/exit look
          const kOut = exitEase(phase(sigma, b.xS, b.xE));
          const kIn = 1 - enterEase(phase(sigma, b.eS, b.eE));
          const look = kOut > 0 ? exitLook : enterLook;
          const k = kOut > 0 ? kOut : kIn;

          // The element's on-screen path is evaluated at the SMOOTHED
          // scroll σ, but expressed relative to where the track ACTUALLY
          // is (the `s - sigma` term). So it eases/trails like before,
          // yet during the lock — where its path is flat — the offset
          // cancels the real track motion exactly: still pixel-stable,
          // even while σ is still catching up.
          const x = xAt(sigma) + (s - sigma) + look.x * k;
          const y = b.cy + look.y * k;
          curX = x;
          curY = y;
          const scale = 1 + (look.scale - 1) * k;
          const transform =
            Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && scale === 1
              ? ""
              : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)${
                  scale !== 1 ? ` scale(${scale.toFixed(4)})` : ""
                }`;
          if (transform !== lastTransform) root.style.transform = lastTransform = transform;

          const opacity = k === 0 ? "" : (1 + (look.opacity - 1) * k).toFixed(3);
          if (opacity !== lastOpacity) {
            root.style.opacity = lastOpacity = opacity;
            root.style.visibility = opacity === "0.000" ? "hidden" : "";
          }
          const blur = look.blur * k;
          const filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
          if (filter !== lastFilter) {
            root.style.filter = lastFilter = filter;
            root.style.willChange = filter ? "transform, opacity, filter" : "";
          }

          onScrollRef.current?.(sigma);
        };

        resolveAll();
        ScrollTrigger.addEventListener("refresh", resolveAll);
        gsap.ticker.add(tick);
        tick();
        root.dataset.motionReady = "true";

        return () => {
          gsap.ticker.remove(tick);
          ScrollTrigger.removeEventListener("refresh", resolveAll);
          for (const p of ["transform", "opacity", "filter", "visibility", "willChange"] as const) {
            root.style[p] = "";
          }
          delete root.dataset.motionReady;
        };
      }

      return () => mm.revert();
    },
    { scope: ref, dependencies: [configKey], revertOnUpdate: true },
  );

  return (
    <div
      ref={ref}
      className={className ? `scroll-motion ${className}` : "scroll-motion"}
      data-motion-enter={enter ? "" : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
