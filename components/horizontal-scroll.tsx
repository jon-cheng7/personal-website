"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { getIntroPhase, subscribeIntroPhase } from "@/lib/intro-store";
import "./horizontal-scroll.css";

interface HorizontalScrollProps {
  /** Each direct child renders as one full-viewport panel — except a
   * <Stage> (components/stage.tsx), which is a free-form canvas of its own
   * `length`. */
  children: ReactNode;
  /** Where the frost/fade zone's far (fully-settled) edge sits, as a
   * fraction of the viewport's width measured from its LEFT edge. `0` (the
   * default) is exactly the edge itself, which means the zone's visible
   * on-screen portion is empty — nothing actually fades/frosts until
   * content has already crossed fully off-screen (harmless, just not very
   * visible; see `horizontal-scroll.css`'s own comment on the mask math).
   * A larger value (e.g. `0.1`–`0.15`) moves that edge inward, giving the
   * effect a real, visible band near the side of the screen — this is
   * what page.tsx's own Hero usage sets. A negative value pushes it
   * further off-screen than default, so the effect never becomes visible
   * at all. */
  fadeBarrier?: number;
  /** How far the frost (blur) ramp reaches back into the zone above,
   * relative to the bands' own tuned, full-scale progression — `1` (the
   * default usage in page.tsx's Hero) is that full progression; smaller
   * values pull the whole ramp proportionally closer to the edge, for a
   * shorter, more concentrated frost; `0` collapses it to a hard edge with
   * no diffusion at all. Used to also size the opacity fade itself, back
   * when that carried most of the effect's visual weight — it no longer
   * does (see `horizontal-scroll.css`'s own comment on why), so this now
   * only ever shapes how far the blur reaches. Defaults to `0.6`. */
  fadeDiffusion?: number;
  /** Maximum blur, in px, applied at full exit — how frosted the glass
   * gets by the time something has fully crossed the diffusion distance
   * above. Also sets how strong the visible on-screen frost overlay gets
   * at its deepest (right at the edge) — see `horizontal-scroll.css`.
   * Defaults to `14`. */
  fadeMaxBlur?: number;
}

const DEFAULT_FADE_BARRIER = 0;
const DEFAULT_FADE_DIFFUSION = 0.6;
const DEFAULT_FADE_MAX_BLUR_PX = 14;

/**
 * Kill switch for the exit-frost effect (the dimming overlay + four-layer
 * `backdrop-filter` blur stack rendered in `.horizontal-scroll__frost` —
 * NOT the horizontal-scroll pin/scrub itself, which is unaffected and
 * stays on regardless of this flag). Flipped off 2026-10-21: even after
 * removing the viewport-wide `mask-image` (the architecture doc's ninth
 * log entry — a confirmed, real performance bug), the effect was still
 * reported as causing considerable lag live. Rather than keep chasing an
 * increasingly narrow slice of what is very likely still a GPU/compositor-
 * bound cost from page JS — which, as that log entry explains, main-thread
 * timing genuinely cannot observe reliably — this turns the whole effect
 * off outright while leaving every line of its implementation in place
 * and fully wired up, so it can come back the moment it's wanted again or
 * once a real DevTools Performance trace says what's actually worth
 * optimizing, instead of only being disabled.
 *
 * TO RE-ENABLE: set this back to `true`. Nothing else needs to change —
 * the `.horizontal-scroll__frost` markup below, all five layers' CSS in
 * horizontal-scroll.css, the `data-frost-ready` entrance-gating effect
 * just below, and the `fadeBarrier`/`fadeDiffusion`/`fadeMaxBlur` props
 * and CSS variables are all still fully wired up and untouched by this
 * switch — flipping it back on restores the exact effect as of the
 * architecture doc's ninth log entry (viewport-wide `mask-image` removed,
 * blur bands strip-scoped, entrance-gated), with zero other edits
 * required anywhere in this file or horizontal-scroll.css.
 */
const FROST_EFFECT_ENABLED = false;

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
 * As content nears the LEFT edge (the `fadeBarrier`/`fadeDiffusion` zone
 * below), it passes behind an increasingly frosted pane of glass — rather
 * than just sliding out sharp and instant, or simply fading into the
 * section's own black background. That distinction (glass, not fade-to-
 * black) is the whole point of the effect, and it's why blur — not opacity
 * — carries the effect's visual weight; see `horizontal-scroll.css`'s own
 * comments for exactly how each half pulls that off.
 *
 * This used to be driven per-element — every individually-faded piece
 * (components/hero.tsx's letters/circle, components/split-text.tsx's
 * per-letter body copy, components/hero.tsx's portrait) was measured once
 * and then had its OWN opacity/blur written by JS every scrub frame, keyed
 * off that one element's own left edge. That worked, but it meant a WIDE
 * element (Hero's own large wordmark letters especially) got ONE uniform
 * blur value for its entire width based solely on where its left edge
 * happened to be — so a letter straddling the fade zone looked uniformly
 * blurred even while most of its own area was still comfortably on
 * screen, and neighboring letters (each measured independently) showed a
 * visible STEP in blur between them rather than one continuous gradient.
 * Doing this truly "per pixel" isn't something per-element measurement can
 * ever achieve — it needs every pixel to know its own distance from the
 * edge, not just whatever one reference element it happens to belong to.
 *
 * The fix: stop measuring elements at all. A viewport-anchored overlay —
 * see `.horizontal-scroll__frost` in horizontal-scroll.css — sits on top
 * of this pinned section at a fixed screen position (0% = this box's left
 * edge), fading/frosting ANY pixel that crosses it uniformly as the track
 * translates underneath — letters, the circle, the portrait, body copy, an
 * image, an SVG, all for free, with no per-element opt-in needed. A
 * previous revision of this used a `mask-image` applied to the whole
 * pinned section for the opacity half of this, which turned out to be a
 * real performance bug (full-viewport masked-compositing cost for an
 * effect that only ever did anything in a thin on-screen strip — see
 * horizontal-scroll.css's own comment on `.horizontal-scroll__frost` for
 * the fix and why it's pixel-equivalent); the opacity dimming now lives as
 * a plain gradient painted directly on that already-narrow strip instead.
 * The frosting itself layers a few masked `backdrop-filter: blur()` bands
 * plus one plain translucent tint band over the same zone, using the same
 * "stacked progressive blur" technique production UIs use for edge-
 * blurred panels (iOS navigation bars, &c.) — several bands of increasing
 * blur, each masked to a different depth within the zone, so the TOTAL
 * blur ramps up smoothly as content slides under it rather than switching
 * on at one flat strength, with the tint band on top giving the zone a
 * visible glass-like surface rather than just a dilution toward the
 * section's own black.
 *
 * All of this is pure CSS, computed once and left to the compositor from
 * then on — no per-scroll-frame JS, no `getBoundingClientRect()` reads, no
 * per-element style writes, and no `[data-scroll-fade]` opt-in markup to
 * remember to add to new content. This also directly replaces Hero's own
 * bespoke portrait exit-frost (it had one specifically because its extra
 * parallax offset meant the generic per-element system here couldn't
 * account for its real position) — a viewport-anchored overlay doesn't
 * care WHY something is at a given x position, so it handles the portrait
 * the same way as everything else with no special-casing at all.
 *
 * The frost (both the dimming overlay and the blur bands) is additionally
 * switched off for the duration of Hero's own opening entrance and
 * re-enabled once it settles — see the `data-frost-ready` gating in the
 * effect below for why.
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

        // How far the track travels: from its left edge to the right edge
        // of its LAST panel, minus one screen. Measured from layout (rect
        // differences, so the track's own translation cancels out) rather
        // than `track.scrollWidth`, which also counts overflow — so an
        // element placed or parallaxed past the end of a <Stage>
        // (components/stage.tsx), or a transform on anything inside, can
        // never change the scroll length. Panel/Stage widths are the only
        // thing that does.
        const distance = () => {
          const last = track.lastElementChild;
          if (!last) return 0;
          const contentWidth =
            last.getBoundingClientRect().right - track.getBoundingClientRect().left;
          return contentWidth - window.innerWidth;
        };
        if (distance() <= 0) return;

        // Nothing here needs to react to a resize any more — see the doc
        // comment above. The scrub tween below is the whole effect's only
        // remaining moving part, and ScrollTrigger's own
        // `invalidateOnRefresh` already keeps ITS measurements
        // (`distance()`, the pin boundaries) correct across a resize on
        // its own, same as before.
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      },
    );

    // Keeps the exit frost (the dimming overlay plus the four stacked
    // `backdrop-filter: blur()` layers, both in horizontal-scroll.css's
    // `.horizontal-scroll__frost`) switched off for as long as
    // components/hero.tsx's own opening entrance is still running,
    // re-enabling it only once that settles. The backdrop-filter bands are
    // genuinely expensive to keep live: each one continuously resamples
    // whatever's rendered behind it. For the few seconds Hero's entrance
    // timeline is actively animating opacity/transform/filter on several
    // elements every frame, that "behind" content is changing constantly —
    // exactly the situation where that cost is most likely to surface as
    // dropped frames (reported as discernible lag during the opening
    // animation). There's also nothing for the effect to usefully do yet:
    // the visitor is still at scroll position 0, nowhere near the left
    // edge it exists to react to, so disabling it for this stretch costs
    // nothing visually.
    //
    // Driven by `lib/intro-store.ts` — the same "hidden" → "revealing" →
    // "idle" broadcast Hero's own entrance already makes for the nav/
    // cursor chrome — rather than this component re-deriving anything of
    // its own. `data-frost-ready` only flips to `"true"` once the intro
    // phase reaches `"idle"`; `horizontal-scroll.css`'s frost rule is
    // scoped to require it. React runs a child's effects before its
    // parent's, and Hero is mounted as this component's own child, so by
    // the time this effect runs on Home, Hero's own layout effect has
    // already called `setIntroPhase("hidden")` moments earlier in the same
    // browser task — the attribute starts correctly disabled, with no
    // flash of the full-cost frost before it. On every other route (Hero
    // never mounts there, so the phase never leaves its default `"idle"`),
    // this reads `"idle"` immediately and the frost is live from the very
    // first frame, same as before this change.
    // Entrance-gating is only worth doing while the frost itself can
    // render at all — see FROST_EFFECT_ENABLED above. Skipped (not just
    // harmlessly inert) while the switch is off, so disabling the effect
    // also means zero extra work of any kind, not merely zero paint cost.
    if (FROST_EFFECT_ENABLED) {
      const section = sectionRef.current;
      const applyFrostReady = (phase: ReturnType<typeof getIntroPhase>) => {
        if (section) section.dataset.frostReady = phase === "idle" ? "true" : "false";
      };
      applyFrostReady(getIntroPhase());
      const unsubscribeIntroPhase = subscribeIntroPhase(applyFrostReady);

      return () => {
        mm.revert();
        unsubscribeIntroPhase();
      };
    }

    return () => {
      mm.revert();
    };
  }, []);

  // Threaded through as CSS custom properties rather than hard-coded in
  // horizontal-scroll.css, so a consumer's fadeBarrier/fadeDiffusion/
  // fadeMaxBlur props (page.tsx's own Hero usage, e.g.) still reach the
  // mask/overlay math there — see that file for how each is used.
  const fadeVars = {
    "--fade-barrier": fadeBarrier,
    "--fade-diffusion": fadeDiffusion,
    "--fade-max-blur": `${fadeMaxBlur}px`,
  } as CSSProperties;

  return (
    // Fixed creative choice, independent of the theme system (see
    // app/globals.css's color-tokens comment) — this section's background
    // is always #000 (below, in horizontal-scroll.css), in both light and
    // dark theme. Tagged directly rather than relying on the ambient
    // `data-chrome-tone` app/layout.tsx puts on <html>, which follows theme
    // and would be wrong here whenever the theme itself is light — see
    // lib/chrome-tone.ts for how a more deeply-nested tag like this one
    // wins over that ambient default for its own area.
    <div
      ref={sectionRef}
      className="horizontal-scroll"
      data-chrome-tone="light-on-dark"
      style={fadeVars}
    >
      <div ref={trackRef} className="horizontal-scroll__track">
        {children}
      </div>
      {/* The frosting half of the edge effect — see this file's own doc
          comment and horizontal-scroll.css for the mask/blur/tint math.
          Purely decorative and never the target of a click/hover, so it's
          both inert (`pointer-events: none`, in CSS) and hidden from
          assistive tech. Five bands — four progressive blur layers plus
          one plain translucent tint layer on top — is horizontal-
          scroll.css's own tunable choice of how the stack is built; change
          the count in both places together if that's ever retuned.

          Gated on FROST_EFFECT_ENABLED above (currently off) — not
          rendered at all while off, rather than hidden with CSS, so there
          is zero `backdrop-filter`/compositing cost of any kind, not just
          zero visible output. See that constant's own comment for how to
          bring this back. */}
      {FROST_EFFECT_ENABLED && (
        <div className="horizontal-scroll__frost" aria-hidden="true">
          <div className="horizontal-scroll__frost-layer" />
          <div className="horizontal-scroll__frost-layer" />
          <div className="horizontal-scroll__frost-layer" />
          <div className="horizontal-scroll__frost-layer" />
          <div className="horizontal-scroll__frost-layer" />
        </div>
      )}
    </div>
  );
}
