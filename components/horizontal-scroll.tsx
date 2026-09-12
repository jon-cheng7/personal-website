"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import "./horizontal-scroll.css";

interface HorizontalScrollProps {
  /** Each direct child renders as one full-viewport panel. */
  children: ReactNode;
  /** Where the fade "barrier" sits, as a fraction of the viewport's width
   * measured from its LEFT edge. `0` (the default) is exactly the edge
   * itself — an element starts fading the instant it begins scrolling out
   * from under the pin. A positive value (e.g. `0.15`) moves the barrier
   * inward, so elements start fading before they even reach the edge —
   * useful if content near the edge otherwise reads as cut off too
   * abruptly. A negative value moves it further left, off-screen, so
   * elements have to travel some distance *past* the edge, already fully
   * hidden, before they start visibly fading — rarely useful on its own,
   * but combined with a small `fadeDiffusion` it produces more of a sharp
   * "cliff" than a gradual dissolve. */
  fadeBarrier?: number;
  /** How much horizontal travel — as a fraction of the viewport's width —
   * an element spends transitioning from fully visible to fully faded/
   * blurred once it crosses the barrier above. This is the "diffusion"
   * distance: larger (e.g. `1.0`, a full viewport width) reads as a long,
   * gradual dissolve; smaller (e.g. `0.15`) reads as a quick, almost-hard
   * cutoff. Defaults to `0.6`. Can be overridden per element with a
   * `data-scroll-fade-diffusion="<fraction>"` attribute, for a piece that
   * should dissolve faster or slower than the rest of its panel. */
  fadeDiffusion?: number;
  /** Maximum blur, in px, applied once an element has fully crossed the
   * diffusion distance above — how "frosted" the glass gets at full exit.
   * Defaults to `14`. Can be overridden per element with a
   * `data-scroll-fade-blur="<px>"` attribute. */
  fadeMaxBlur?: number;
}

const DEFAULT_FADE_BARRIER = 0;
const DEFAULT_FADE_DIFFUSION = 0.6;
const DEFAULT_FADE_MAX_BLUR_PX = 14;

/** One `[data-scroll-fade]` element plus everything `applyExitFade` needs
 * to compute its progress every frame WITHOUT a `getBoundingClientRect()`
 * call each time — see this file's own doc comment on why that read (a
 * forced layout, once per element per frame) is the one thing standing
 * between "per element" and genuinely "per letter": measured once, up
 * front, per element instead. */
interface FadeTarget {
  el: HTMLElement;
  /** This element's own `left`, in viewport px, at the moment it was
   * measured (`track`'s `x` was 0 then — see `measureFadeTargets`) — its
   * position is `restLeft + <track's current x>` at any later frame,
   * since every element in the track moves rigidly together with it. */
  restLeft: number;
  /** This element's own diffusion distance override (viewport-width
   * fraction), or `null` to use the panel-wide default. */
  diffusion: number | null;
  /** This element's own max-blur override (px), or `null` to use the
   * panel-wide default. */
  maxBlurPx: number | null;
}

function parseFloatAttr(el: HTMLElement, name: string): number | null {
  const raw = el.getAttribute(name);
  if (raw === null) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * On screens wider than 900px (matches the nav's own breakpoint), pins
 * this section and translates its children horizontally as the visitor
 * scrolls vertically — the classic "horizontal scroll gallery" pattern,
 * same scrub-linked approach as pinned-scrub-example.tsx. Below 900px it's
 * a plain vertical stack instead: native scrolling, no pin, no transform.
 *
 * Uses GSAP's matchMedia so this re-evaluates cleanly on resize (rotating
 * a tablet, or a desktop window crossing the breakpoint) — matchMedia
 * automatically tears down the pin/transform the moment the query stops
 * matching, so there's no separate cleanup branch to maintain by hand.
 *
 * prefers-reduced-motion is folded into the same query: horizontal
 * scroll-jacking only ever activates without it, so a reduced-motion
 * visitor always gets the plain vertical stack regardless of screen size.
 *
 * As an element crosses the fade barrier (see `fadeBarrier` above — the
 * viewport's left edge by default), it fades and blurs out — "as if going
 * behind a frosted glass pane" per the brief — rather than just sliding out
 * sharp and instant. Driven off the same scrub tween as the horizontal
 * translation itself (its own onUpdate, not ScrollTrigger's) so the fade is
 * exactly in step with what's on screen each frame, including the scrub's
 * own smoothing lag, rather than racing ahead of or behind it.
 *
 * Per-element, down to individual letters, not per-panel: each panel (a
 * direct child of the track) can mark its own individually-fading pieces
 * with a `data-scroll-fade` attribute — components/hero.tsx's letters and
 * circle, and components/split-text.tsx's per-letter split for body copy,
 * are both examples — and each marked piece gets its own exit progress
 * computed from its own position, so pieces at different horizontal
 * positions within the same panel independently begin fading as they
 * individually near the barrier, rather than the whole panel (or word, or
 * line) dissolving as one flat block. A panel with no `data-scroll-fade`
 * descendants just fades as a whole instead — the fallback below — so
 * content that hasn't opted into any finer granularity yet still gets the
 * effect for free rather than silently missing out on it.
 *
 * The one thing that makes doing this at letter granularity (hundreds of
 * elements on a text-heavy panel) actually cheap rather than a scroll-jank
 * risk: every fade target's position is measured ONCE, up front
 * (`measureFadeTargets`), not via `getBoundingClientRect()` again on every
 * scrub frame. Since every element inside `track` moves rigidly together
 * with it (only `track`'s own `x` ever changes — nothing inside it is
 * independently positioned), a target's live position is just its
 * once-measured position plus `track`'s current `x`, which GSAP already
 * has cached from driving the translation tween in the first place
 * (`gsap.getProperty`, not a DOM read) — so `applyExitFade` below is pure
 * arithmetic and style writes every frame, zero forced layout reads,
 * regardless of how many letters are on screen. A `resize` listener
 * re-measures, since the cached positions are only valid for the viewport
 * size they were measured at.
 *
 * Known tradeoff, not fully solved here: horizontal-scroll-via-vertical-
 * scroll is inherently a bit disorienting for screen-reader/keyboard use,
 * since scroll position doesn't follow focus. Tab order still matches the
 * visual left-to-right sequence, which covers the basics — worth a closer
 * look once this holds real content instead of placeholders.
 */
export function HorizontalScroll({
  children,
  fadeBarrier = DEFAULT_FADE_BARRIER,
  fadeDiffusion = DEFAULT_FADE_DIFFUSION,
  fadeMaxBlur = DEFAULT_FADE_MAX_BLUR_PX,
}: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
      () => {
        const track = trackRef.current;
        const section = sectionRef.current;
        if (!track || !section) return;

        const distance = () => track.scrollWidth - window.innerWidth;
        if (distance() <= 0) return;

        // Cached once rather than re-queried every frame — the set of
        // panels (and their marked pieces) doesn't change over this
        // effect's lifetime, only re-measured (below) on resize.
        const panels = gsap.utils.toArray<HTMLElement>(track.children);
        const panelFadeElements: HTMLElement[][] = panels.map((panel) => {
          const marked = Array.from(
            panel.querySelectorAll<HTMLElement>("[data-scroll-fade]"),
          );
          return marked.length > 0 ? marked : [panel];
        });

        let fadeTargets: FadeTarget[] = [];

        // Measures every fade target's position at the CURRENT `track.x`
        // (must be called while `track.x` is 0 — true both at setup, before
        // the tween below ever runs, and again on resize, since a resize
        // mid-scroll still leaves `track.x` wherever ScrollTrigger's own
        // `invalidateOnRefresh` recalculates it, not necessarily 0 — so
        // `restLeft` is computed relative to whatever `track.x` actually is
        // at measurement time, not hardcoded against 0). Also where each
        // target's own diffusion/blur overrides are read — cheap, and only
        // needs doing again when the set of targets or their attributes
        // could plausibly have changed (never, currently, but harmless to
        // redo alongside a resize's re-measurement).
        const measureFadeTargets = () => {
          const currentX = (gsap.getProperty(track, "x") as number) || 0;
          fadeTargets = panelFadeElements.flat().map((el) => {
            const restLeft = el.getBoundingClientRect().left - currentX;
            return {
              el,
              restLeft,
              diffusion: parseFloatAttr(el, "data-scroll-fade-diffusion"),
              maxBlurPx: parseFloatAttr(el, "data-scroll-fade-blur"),
            };
          });
        };
        measureFadeTargets();

        const applyExitFade = () => {
          const currentX = (gsap.getProperty(track, "x") as number) || 0;
          const barrierX = window.innerWidth * fadeBarrier;
          for (const target of fadeTargets) {
            const diffusionPx =
              window.innerWidth *
              (target.diffusion ?? fadeDiffusion);
            const maxBlurPx = target.maxBlurPx ?? fadeMaxBlur;
            const left = target.restLeft + currentX;
            // 0 while an element sits at/before the barrier (not yet
            // exiting); ramps to 1 as its left edge travels `diffusionPx`
            // past the barrier; clamped, so a fully-exited element (well
            // past that distance) just holds at the faded/blurred end
            // state rather than the math running away.
            const exitProgress = gsap.utils.clamp(
              0,
              1,
              (barrierX - left) / diffusionPx,
            );
            gsap.set(target.el, {
              opacity: 1 - exitProgress,
              filter:
                exitProgress > 0
                  ? `blur(${(exitProgress * maxBlurPx).toFixed(2)}px)`
                  : "none",
            });
          }
        };

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          onUpdate: applyExitFade,
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        });

        const handleResize = () => {
          measureFadeTargets();
          applyExitFade();
        };
        window.addEventListener("resize", handleResize);

        // Runs automatically when the query above stops matching (window
        // resized under 901px, or reduced-motion switched on mid-visit) —
        // resets every target back to its plain, fully-visible state so the
        // vertical-stack fallback never inherits a stuck fade/blur from
        // whatever scroll position the horizontal mode was left at.
        return () => {
          window.removeEventListener("resize", handleResize);
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(
            fadeTargets.map((t) => t.el),
            { clearProps: "opacity,filter" },
          );
        };
      },
    );

    return () => mm.revert();
  }, [fadeBarrier, fadeDiffusion, fadeMaxBlur]);

  return (
    // Fixed creative choice, independent of the theme system (see
    // app/globals.css's color-tokens comment) — this section's background
    // is always #000 (below, in horizontal-scroll.css), in both light and
    // dark theme. Tagged directly rather than relying on the ambient
    // `data-chrome-tone` app/layout.tsx puts on <html>, which follows theme
    // and would be wrong here whenever the theme itself is light — see
    // lib/chrome-tone.ts for how a more deeply-nested tag like this one
    // wins over that ambient default for its own area.
    <div ref={sectionRef} className="horizontal-scroll" data-chrome-tone="light-on-dark">
      <div ref={trackRef} className="horizontal-scroll__track">
        {children}
      </div>
    </div>
  );
}
