"use client";

import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { resolveScrollPoint, type ScrollPoint } from "@/lib/scroll-bound";
import "./frost-panel.css";

// ---------------------------------------------------------------------------
// FrostPanel — a reusable rounded-rectangle container (mostly for text) that
// frosts in and out on scroll exactly the way the hero portrait
// (`sorrento.png`, components/hero.tsx) frosts out:
//
//   frost 0 → 1:  opacity 1 → 0  and  blur(0) → blur(maxBlur)   (linear)
//
// driven by the SAME smoothed (scrubbed) scroll position as its parallax —
// the portrait's `applyExitFrost` runs off its parallax tween's onUpdate, and
// so does this. The entrance is that exact mapping played backwards
// (frost 1 → 0) over its own scroll range.
//
//   scroll ─┬── enter.start ── enter.end ───── exit.start ── exit.end ──▶
//   frost   1 ······ 1 → 0 ········· 0 ··········· 0 → 1 ········ 1
//
// Omit `enter` to start fully visible; omit `exit` to never leave.
//
// Parallax (also the portrait's model): the panel drifts at `factor` × the
// page's horizontal speed (1 = moves with the page, 0 = pinned to the
// screen, 0.4 = the portrait's lingering drift). `anchor` is the scroll
// position at which the parallax offset is zero (default: midway between
// fully-in and starting to leave). With `centerAtAnchor`, the panel is also
// shifted so that at `anchor` it sits dead-center on screen, wherever it
// happens to be in the page's layout — so its timing (scroll ranges) and its
// placement can't drift apart on different screen sizes.
//
// Scope: the scroll animation runs only in the desktop horizontal mode
// (> 900px, no reduced motion — same query as horizontal-scroll.tsx). On
// mobile's vertical stack and under reduced motion the panel is simply a
// static, fully visible card in normal flow.
//
// Performance: one scrubbed tween per panel (x) whose onUpdate writes at
// most opacity/filter, and only when the quantized value changes; no
// per-frame layout reads (geometry is measured on ScrollTrigger refresh
// only); `will-change` only while actually mid-frost; fully-gone panels are
// `visibility: hidden` so their content can't be hit-tested or focused.
// ---------------------------------------------------------------------------

/** Defaults copied from the portrait so the two read identically. */
const DEFAULT_MAX_BLUR_PX = 30; //  hero.tsx PORTRAIT_FADE_MAX_BLUR_PX
const DEFAULT_SMOOTHING = 2.5; //   hero.tsx PORTRAIT_PARALLAX_SCRUB

const DESKTOP_MOTION_QUERY =
  "(min-width: 901px) and (prefers-reduced-motion: no-preference)";

export type FrostRange = { start: ScrollPoint; end: ScrollPoint };

export type FrostParallax = {
  /** Fraction of the page's horizontal speed the panel moves at. */
  factor: number;
  /** Scroll position where the parallax offset is zero. */
  anchor?: ScrollPoint;
  /** Shift the panel so it's centered on screen at `anchor`. */
  centerAtAnchor?: boolean;
};

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: ReactNode;
  /** Scroll range over which it frosts IN (reverse of the exit). */
  enter?: FrostRange;
  /** Scroll range over which it frosts OUT (portrait-style). */
  exit?: FrostRange;
  parallax?: FrostParallax;
  /** Scrub smoothing in seconds (how far the motion lags the wheel). */
  smoothing?: number;
  /** Blur, in px, when fully frosted. */
  maxBlur?: number;
};

const clamp01 = gsap.utils.clamp(0, 1);

export function FrostPanel({
  children,
  enter,
  exit,
  parallax,
  smoothing = DEFAULT_SMOOTHING,
  maxBlur = DEFAULT_MAX_BLUR_PX,
  className,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Serialisable config → stable dependency key (props may be fresh object
  // literals every render, which would otherwise rebuild the tween).
  const configKey = JSON.stringify([enter, exit, parallax, smoothing, maxBlur], (_, v) =>
    typeof v === "function" ? String(v) : v,
  );

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add(DESKTOP_MOTION_QUERY, () => {
        let teardown: (() => void) | null = null;
        // Deferred one frame: the parent <HorizontalScroll> creates its pin
        // in its own layout effect, which React runs AFTER this child's —
        // the pin's real start/end must exist before we read them (same
        // reason hero.tsx sets up the portrait's parallax late).
        const raf = requestAnimationFrame(() => {
          teardown = setup(el);
        });
        return () => {
          cancelAnimationFrame(raf);
          teardown?.();
        };
      });

      function setup(el: HTMLDivElement) {
        const section = el.closest<HTMLElement>(".horizontal-scroll");
        const track = el.closest<HTMLElement>(".horizontal-scroll__track");
        const pin = section
          ? ScrollTrigger.getAll().find((st) => st.trigger === section && st.pin)
          : undefined;
        // Outside a horizontal pin: plain page scroll, no parallax.
        const horizontal = Boolean(pin && track);

        const pinStart = () => (pin ? pin.start : 0);
        const pinEnd = () => (pin ? pin.end : ScrollTrigger.maxScroll(window));

        // ---- geometry & bounds, re-resolved on every ScrollTrigger refresh
        let b = { enterS: 0, enterE: 0, exitS: 0, exitE: 0, anchor: 0, center: 0 };
        const resolveAll = () => {
          const enterS = enter ? resolveScrollPoint(enter.start) : -Infinity;
          const enterE = enter ? resolveScrollPoint(enter.end) : -Infinity;
          const exitS = exit ? resolveScrollPoint(exit.start) : Infinity;
          const exitE = exit ? resolveScrollPoint(exit.end) : Infinity;
          const anchor =
            parallax?.anchor !== undefined
              ? resolveScrollPoint(parallax.anchor)
              : enter && exit
                ? (enterE + exitS) / 2
                : enter
                  ? enterE
                  : exit
                    ? exitS
                    : pinStart();
          // Panel's horizontal center in TRACK space, ignoring transforms
          // (subtracting the track's own rect cancels the scrub's x; our own
          // x is subtracted explicitly). Read only here, on refresh.
          let center = 0;
          if (horizontal && track) {
            const r = el.getBoundingClientRect();
            const ownX = (gsap.getProperty(el, "x") as number) || 0;
            center = r.left - track.getBoundingClientRect().left - ownX + r.width / 2;
          }
          b = { enterS, enterE, exitS, exitE, anchor, center };
        };

        // Own x at scroll position `s`: zero at the anchor, then drifting
        // by (1 - factor) of the track's motion — net on-screen speed is
        // exactly `factor` × the page's (see hero.tsx's portrait parallax).
        // Plus, optionally, a constant that centers it on screen at anchor.
        const xAt = (s: number) => {
          if (!horizontal) return 0;
          const factor = parallax?.factor ?? 1;
          let offset = 0;
          if (parallax?.centerAtAnchor) {
            const screenCenterAtAnchor = b.center - (b.anchor - pinStart());
            offset = window.innerWidth / 2 - screenCenterAtAnchor;
          }
          return offset + (s - b.anchor) * (1 - factor);
        };

        // ---- frost (the portrait's exit mapping, both directions) ----
        let lastFrost = -1; // impossible value → first apply always writes
        const applyFrost = (s: number) => {
          const inP =
            b.enterE > b.enterS ? clamp01((s - b.enterS) / (b.enterE - b.enterS)) : s >= b.enterE ? 1 : 0;
          const outP =
            b.exitE > b.exitS ? clamp01((s - b.exitS) / (b.exitE - b.exitS)) : s >= b.exitE ? 1 : 0;
          // 0 = crisp & opaque, 1 = fully frosted & gone.
          const frost = Math.round(Math.max(1 - inP, outP) * 1000) / 1000;
          if (frost === lastFrost) return;
          const wasActive = lastFrost > 0 && lastFrost < 1;
          const isActive = frost > 0 && frost < 1;
          lastFrost = frost;

          el.style.opacity = frost === 0 ? "" : String(1 - frost);
          el.style.filter = frost > 0 ? `blur(${(frost * maxBlur).toFixed(2)}px)` : "";
          el.style.visibility = frost === 1 ? "hidden" : "";
          if (isActive !== wasActive) el.style.willChange = isActive ? "opacity, filter, transform" : "";
        };

        // One scrubbed tween across the whole pin: its smoothed progress IS
        // the scroll position both the parallax and the frost read from.
        // Function-based values re-run on every ScrollTrigger refresh
        // (resize etc.), which is when geometry/bounds get re-measured.
        let tween: gsap.core.Tween | undefined;
        const smoothedScroll = () =>
          pinStart() + (tween ? tween.progress() : 0) * (pinEnd() - pinStart());
        resolveAll();
        tween = gsap.fromTo(
          el,
          {
            x: () => {
              resolveAll();
              return xAt(pinStart());
            },
          },
          {
            x: () => {
              resolveAll();
              return xAt(pinEnd());
            },
            ease: "none",
            onUpdate: () => applyFrost(smoothedScroll()),
            scrollTrigger: {
              trigger: section ?? el,
              start: pinStart,
              end: pinEnd,
              scrub: smoothing,
              invalidateOnRefresh: true,
            },
          },
        );
        applyFrost(smoothedScroll());
        el.dataset.frostReady = "true";

        return () => {
          tween?.scrollTrigger?.kill();
          tween?.kill();
          gsap.set(el, { clearProps: "x" });
          el.style.opacity = "";
          el.style.filter = "";
          el.style.visibility = "";
          el.style.willChange = "";
          delete el.dataset.frostReady;
        };
      }

      return () => mm.revert();
    },
    { scope: ref, dependencies: [configKey], revertOnUpdate: true },
  );

  return (
    <div
      ref={ref}
      className={className ? `frost-panel ${className}` : "frost-panel"}
      // Lets CSS hide it until JS has applied its scroll state, so a panel
      // that should start frosted never flashes visible first.
      data-frost-enter={enter ? "" : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
