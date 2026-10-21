"use client";

import { useRef, useState, type MutableRefObject, type Ref } from "react";
import Image from "next/image";
import { TransitionLink } from "@/components/transition-link";
import {
  SpeechBubble,
  type SpeechBubbleHandle,
  type ScrollBound,
} from "@/components/speech-bubble";
import { createAboutScript, createGreetingScript } from "@/lib/hero-dialogue";
import { ABOUT_BUBBLE } from "@/lib/home-choreography";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { setIntroPhase } from "@/lib/intro-store";
import "./hero.css";

// ---------------------------------------------------------------------------
// Portrait (public/sorrento.png) — every aesthetic knob for its reveal,
// scroll-parallax and edge-exit lives here as one named constant each, same
// "name the constant, tune later" convention as RIM_ROTATION_SECONDS etc.
// below. Nothing else in this file needs touching to retune the feel.
// ---------------------------------------------------------------------------

/** Source file, under /public — see that folder for the (large) original;
 * next/image (app/next.config.ts already configures AVIF/WebP output) takes
 * care of resizing and re-encoding it to whatever size actually ships. */
const PORTRAIT_SRC = "/sorrento.png";

/** ---- resting size & position (desktop) ----
 * Unlike the entrance/scroll/fade knobs below (which are all about
 * MOTION), these three describe the portrait's static resting geometry —
 * computed once per layout pass by `fitPortraitToHeroOverlap` below, the
 * same "measure, don't guess" approach `fitHeroSizeToWidth` already uses
 * for the wordmark itself. All three are free to retune independently. */

/** The portrait's aspect ratio, width ÷ height — same convention as CSS's
 * own `aspect-ratio` property, and MUST be kept equal to hero.css's own
 * `aspect-ratio: 4/5` on `.hero-portrait` (duplicated rather than derived
 * from one shared source, since one lives in CSS and the other in JS —
 * change both together). `4/5` is narrower than tall — the familiar
 * "4x5" portrait-photo ratio. Height is always the dimension derived from
 * the two constraints below (top offset + overlap); this is what then
 * determines width FROM that height, never the other way around — see
 * `fitPortraitToHeroOverlap`. */
const PORTRAIT_ASPECT_RATIO = 4 / 5;

/** The portrait's TOP edge sits this many px below the viewport's own top
 * edge. A fixed pixel offset rather than a fraction of viewport height,
 * so it reads as a constant "reasonable gap from the top" regardless of
 * how tall the viewport happens to be. */
const PORTRAIT_TOP_OFFSET_PX = 96;

/** How far down into `.hero-name` (the "Jon [circle] cheng" row) the
 * portrait's BOTTOM edge should land, as a fraction of hero-name's own
 * rendered height — measured from hero-name's OWN top edge, not the
 * viewport's. `1/3` (the brief's "roughly the top 1/3") means the
 * portrait's bottom overlaps the name row's own top third; `0` would put
 * the portrait's bottom exactly level with the top of the name row (no
 * overlap at all); `1` would reach all the way down to the name row's own
 * bottom edge. */
const PORTRAIT_OVERLAP_FRACTION = 1 / 3;

/** How far right of its resting position the portrait starts, in px — an
 * offset from its own centered position, NOT the viewport edge, per the
 * brief ("not from the edge of the screen just offset from the center to
 * the right"). Also doubles as how far it travels during the entrance. */
const PORTRAIT_ENTRANCE_OFFSET_X = 120;

/** Starting blur, in px, for the entrance's "frosted glass" deblur-in — the
 * same visual language as components/horizontal-scroll.tsx's own exit frost,
 * just played in reverse (blurred+transparent → sharp+opaque) on the way in. */
const PORTRAIT_ENTRANCE_BLUR_PX = 24;

/** Entrance timing. Starts right after the circle/columnGap step of the
 * timeline below finishes — i.e. after the hero text AND the about-me circle
 * have both settled, per the brief. */
const PORTRAIT_ENTRANCE_DURATION = 1.1;
const PORTRAIT_ENTRANCE_EASE = "power3.out";

/** Once the entrance finishes, the portrait's horizontal position is mapped
 * to scroll (desktop/no-reduced-motion only — see setupPortraitScroll).
 * `PORTRAIT_PARALLAX_FACTOR` is the fraction of the main horizontal-scroll
 * track's full travel speed the portrait appears to move at — e.g. `0.4`
 * means it drifts left at 40% of the rest of the page's speed, so it
 * visually lingers behind as everything else slides past underneath it.
 * `1` would match the page exactly (no lag); `0` would pin it in place. */
const PORTRAIT_PARALLAX_FACTOR = 0.4;

/** GSAP `scrub` value for the parallax tween — how much it smooths/lags
 * behind the raw scroll position before catching up. The main track (see
 * horizontal-scroll.tsx) uses `scrub: 1`; a noticeably larger value here is
 * what makes the portrait's motion read as "slower, lingering" frame to
 * frame, on top of the slower travel distance above. */
const PORTRAIT_PARALLAX_SCRUB = 2.5;

/** Mirrors horizontal-scroll.tsx's own `fadeBarrier`/`fadeDiffusion`/
 * `fadeMaxBlur` props, but computed independently for the portrait (that
 * component's generic `[data-scroll-fade]` system assumes an element only
 * moves with the track's own `x`, which isn't true here once the portrait
 * has its own additional parallax offset — see setupPortraitScroll). Same
 * meanings: `BARRIER` is where frosting starts (as a fraction of viewport
 * width from the left edge), `DIFFUSION` is how much travel it takes to go
 * from sharp to fully frosted/invisible, `MAX_BLUR_PX` is the blur at fully
 * exited. */
const PORTRAIT_FADE_BARRIER = 0;
const PORTRAIT_FADE_DIFFUSION = 0.5;
const PORTRAIT_FADE_MAX_BLUR_PX = 30;

// ---- portrait speech bubbles ----
// What they SAY lives in lib/hero-dialogue.ts. Where they sit / how big /
// max width: `.hero-portrait__bubble--*` in hero.css. When they show is
// below. Both are armed only once the portrait's entrance has finished.

/** A scroll threshold expressed as a fraction of the viewport height, so it
 * feels the same on any screen. (Desktop's horizontal pin is still driven
 * by vertical scroll under the hood, so `window.scrollY` works for both
 * the desktop horizontal mode and the mobile vertical stack.) */
const viewportHeights = (fraction: number): ScrollBound => () =>
  window.innerHeight * fraction;

/** Left/greeting bubble: only while the page is at scroll position 0 (with
 * 1px of slack for Lenis's sub-pixel settling). */
const GREETING_BUBBLE_VISIBLE = { to: 1 };

/** Right/"about me" bubble: appears once the visitor has scrolled past
 * `from`, and disappears again past `to`. Plain px numbers work too, e.g.
 * `{ from: 120, to: 700 }`. Tune freely. */
const ABOUT_BUBBLE_VISIBLE = {
  // Values live in lib/home-choreography.ts so other beats (the about
  // card's entrance, app/page.tsx) can be timed relative to this one.
  from: viewportHeights(ABOUT_BUBBLE.fromVh),
  to: viewportHeights(ABOUT_BUBBLE.toVh),
};


const RIM_TEXT = "MORE ABOUT ME";
// Repeated with a bullet separator so the loop has no visible seam at
// whatever startOffset the wipe happens to be sitting at — same reasoning
// as the cursor's own marquee content (components/cursor/global-cursor.css).
const RIM_LOOP = `${RIM_TEXT} • ${RIM_TEXT} • `;

/** How long one full turn of the ambient rim rotation takes, and how much
 * faster it ramps to on hover — tuned by feel, not measured; same
 * "name the constant, tune later" approach as scroll-cue.tsx's
 * IDLE_DELAY_MS. */
const RIM_ROTATION_SECONDS = 20;
const RIM_HOVER_TIMESCALE = 4;

/** The scale the name block starts at before growing into its resting
 * size — "smaller in the middle of the page" per the brief. Tuned by feel. */
const INTRO_START_SCALE = 0.42;

type LetterRefSetter = (index: number, el: HTMLSpanElement | null) => void;

/** One word of the wordmark, split into individually-tweenable letters —
 * same per-character split as components/nav.tsx's MenuLink, minus the
 * hover-flip clone (nothing here needs a second copy). `aria-hidden`: the
 * accessible name for this whole heading comes from the plain-text
 * `.hero-name__sr-only` <h1> in Hero's own render instead (see there for
 * why) so screen readers get one clean read of "jon cheng" rather than
 * eight separately-announced single-letter spans.
 *
 * `data-scroll-fade` on each LETTER (not the word wrapper): opts every
 * individual letter into components/horizontal-scroll.tsx's per-element
 * frosted-glass exit fade at the finest granularity that component
 * supports — each letter has its own horizontal position within the Hero
 * panel, so "J", "o", "n" each start fading at very slightly different
 * moments as the panel scrolls out, rather than the whole word (or the
 * whole panel) dissolving as one flat block.
 *
 * `wordRef`, when passed, goes on this OUTER wrapper — not on any individual
 * letter — so callers can read the whole word's rendered width in one
 * `offsetWidth` read (see Hero's own `fitHeroSizeToWidth` for why: it needs
 * each word's real width-per-em ratio in the active font, which isn't
 * derivable from CSS alone). */
function HeroWord({
  word,
  onLetterRef,
  wordRef,
}: {
  word: string;
  onLetterRef: LetterRefSetter;
  wordRef?: Ref<HTMLSpanElement>;
}) {
  return (
    <span className="hero-name__word" aria-hidden="true" ref={wordRef}>
      {word.split("").map((char, i) => (
        <span
          key={i}
          ref={(el) => onLetterRef(i, el)}
          className="hero-letter"
          data-scroll-fade
          style={{ display: "inline-block" }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const nameRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLAnchorElement>(null);
  const rimRef = useRef<SVGSVGElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const greetingBubbleRef = useRef<SpeechBubbleHandle>(null);
  const aboutBubbleRef = useRef<SpeechBubbleHandle>(null);
  // One fresh, stateful dialogue script per Hero mount (lazy initialisers so
  // they're created once, and the scripts themselves defer anything
  // browser-only until they first run).
  const [greetingScript] = useState(createGreetingScript);
  const [aboutScript] = useState(createAboutScript);
  const jonWordRef = useRef<HTMLSpanElement>(null);
  const chengWordRef = useRef<HTMLSpanElement>(null);
  const rimTweenRef: MutableRefObject<gsap.core.Tween | null> = useRef(null);
  const jonLettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const chengLettersRef = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(() => {
    const name = nameRef.current;
    const circle = circleRef.current;
    const rim = rimRef.current;
    const portrait = portraitRef.current;
    const jonWord = jonWordRef.current;
    const chengWord = chengWordRef.current;
    if (!name || !circle || !portrait || !jonWord || !chengWord) return;

    const letters = [...jonLettersRef.current, ...chengLettersRef.current].filter(
      (el): el is HTMLSpanElement => el !== null,
    );

    // ---- width-fit sizing — layout concern, applies unconditionally ----
    // (before the reduced-motion branch below, since this is about correct
    // RESTING geometry, not about motion/animation).
    //
    // Replaces the old `--hero-size: clamp(2rem, 18vw, 18rem)` guess (an
    // arbitrary vw coefficient tuned by eye, which only coincidentally
    // avoided clipping/underfilling at whatever widths it was checked at)
    // with the actual font-size that makes "Jon [circle] cheng" render at
    // EXACTLY the available width, solved algebraically rather than
    // guessed. CSS has no primitive for "size this text to fill a box" —
    // the per-em width of this specific text in this specific font isn't
    // knowable without rendering it, so this measures once per resize
    // (never per animation frame) and corrects `--hero-size` via an inline
    // custom property, which wins over the CSS clamp() by normal cascade
    // specificity. The clamp() in hero.css stays as the pre-hydration/
    // no-JS fallback; this is what actually governs the resting size from
    // first paint onward.
    //
    // Two of the three widths (the words) scale linearly with font-size —
    // dividing by the CURRENT font-size gives a per-em ratio that holds at
    // ANY font-size for this text/font, so it never needs re-deriving, only
    // re-measuring if the font itself changes (a web-font swap — see the
    // `document.fonts.ready` call below). The circle is measured the same
    // way rather than hardcoding its CSS `0.6em` here, so this stays
    // correct automatically if that ratio is ever retuned in hero.css.
    //
    // The two column-gaps are NOT part of that ratio: `.hero-name`'s own
    // `gap` is its own independent `clamp(1rem, 10vw, 3rem)`, driven by
    // viewport width rather than font-size, so it doesn't scale when
    // `--hero-size` changes. It's read fresh (not cached) on every fit —
    // unlike the word-width ratio, its own resting value genuinely changes
    // with viewport width — and subtracted as a fixed offset before solving
    // for the font-size, rather than folded into the per-em ratio.
    //
    // No upper bound applied here on purpose — a hard ceiling based on
    // viewport HEIGHT is coming later (per the brief: layer it in as
    // `Math.min(fittedSizePx, <height-derived limit>)` below, once that
    // limit is defined) rather than guessed now.
    const fitHeroSizeToWidth = () => {
      const fontSizePx = parseFloat(getComputedStyle(name).fontSize);
      const gapPx = parseFloat(getComputedStyle(name).columnGap) || 0;
      const availableWidth = name.clientWidth;
      if (!fontSizePx || availableWidth <= 0) return;

      const scalingWidthPx = jonWord.offsetWidth + circle.offsetWidth + chengWord.offsetWidth;
      const perEm = scalingWidthPx / fontSizePx;
      if (perEm <= 0) return;

      const fittedSizePx = (availableWidth - 2 * gapPx) / perEm;
      if (fittedSizePx > 0) {
        name.style.setProperty("--hero-size", `${fittedSizePx}px`);
      }
    };

    // The portrait's own resting size/position — see the constants' own
    // comments above for what each knob means. Deliberately measures
    // `name` via `offsetTop`/`offsetHeight`, NOT `getBoundingClientRect()`
    // (which was the first thing tried here, and measured wrong): GSAP's
    // entrance sequence below applies its own transform (translate+scale)
    // to `name` for about a second, and `document.fonts.ready` — which
    // re-runs this same fit, see `fitLayout` below — resolves on its own
    // schedule and can land squarely in the middle of that, well before
    // the transform has settled back to identity. getBoundingClientRect()
    // reflects whatever transform happens to be live at that exact
    // instant, so a fonts.ready fit caught mid-intro silently bakes in a
    // shrunk, off-position reading that's never corrected afterward
    // (confirmed live: the portrait's rendered bottom edge didn't come
    // close to matching hero-name's own top third). `offsetTop`/
    // `offsetHeight` are plain box-model values — defined independently of
    // any `transform` on the element itself or its ancestors — so they
    // always read `name`'s true resting geometry, regardless of whatever
    // GSAP happens to be doing to it at the moment this runs. They also
    // conveniently land in exactly the right coordinate space for free:
    // `name`'s `offsetParent` is `.hero` itself (the nearest positioned
    // ancestor), the SAME element `.hero-portrait`'s own `top` (below) is
    // positioned relative to — no extra conversion needed.
    //
    // Height is the dimension SOLVED FOR (from the top-offset and overlap
    // constraints); width is then derived from that height via the aspect
    // ratio, never the reverse — see PORTRAIT_ASPECT_RATIO's own comment.
    // Only `--sorrento-size` (width) and `--sorrento-top` are written
    // here — height itself is left for hero.css's own `aspect-ratio` to
    // derive from that width, rather than also setting it explicitly, so
    // there's exactly one source of truth for the ratio (hero.css) and
    // this never has to duplicate its arithmetic.
    const fitPortraitToHeroOverlap = () => {
      const top = PORTRAIT_TOP_OFFSET_PX;
      const bottom = name.offsetTop + name.offsetHeight * PORTRAIT_OVERLAP_FRACTION;
      const height = bottom - top;
      if (height <= 0) return;
      const width = height * PORTRAIT_ASPECT_RATIO;
      portrait.style.setProperty("--sorrento-top", `${top}px`);
      portrait.style.setProperty("--sorrento-size", `${width}px`);
    };

    const fitLayout = () => {
      fitHeroSizeToWidth();
      fitPortraitToHeroOverlap();
    };

    fitLayout();
    window.addEventListener("resize", fitLayout);
    // Unbounded loads with `display: "swap"` (app/layout.tsx) — the very
    // first fit above may have measured a fallback font's metrics if
    // Unbounded hadn't finished loading yet. Re-fitting once fonts settle
    // catches the swap; harmless/no-op if Unbounded was already active.
    // Both fits are re-run together: a font swap changes --hero-size,
    // which changes hero-name's rendered height, which is exactly what
    // the portrait's own fit is measuring.
    document.fonts?.ready?.then(fitLayout);
    const cleanupFit = () => window.removeEventListener("resize", fitLayout);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Home's opening beat: hide the persistent nav chrome and the global
    // cursor for its duration — see lib/intro-store.ts for why this goes
    // through a shared module rather than Hero reaching into either
    // directly (both are mounted once in app/layout.tsx and never unmount
    // between routes, so there's no ref/prop path from here to either).
    setIntroPhase("hidden");

    // The rim's ambient rotation runs independent of the reveal timeline
    // below and of reduced-motion — reduced-motion visitors still get the
    // label (per the "always show it" decision for touch, applied here
    // too), just static rather than spinning, same rule as every other
    // looping decoration on this site (see scroll-cue.css's own reduced-
    // motion override).
    if (rim && !prefersReducedMotion) {
      rimTweenRef.current = gsap.to(rim, {
        rotation: 360,
        duration: RIM_ROTATION_SECONDS,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
    }

    // The circle stays a normal flex item of `name` (see hero.css's own
    // comment on why: flexbox is what keeps it exactly centered on the true
    // gap between "Jon" and "cheng" regardless of their differing widths —
    // an absolutely-positioned circle can only center on the container's
    // own geometric midpoint, which isn't the same point). Its "space
    // reserved even while invisible" problem is solved by animating the
    // row's own `columnGap` between 0 (words flush together, "as if no
    // circle was there") and its resting width instead — captured here,
    // before anything below overrides it, so both branches can reference
    // the real value rather than hardcoding it.
    const restingColumnGap = getComputedStyle(name).columnGap;

    if (prefersReducedMotion) {
      // Same rule as every other animated piece on this site: reduced
      // motion means the calm, static end state appears directly, not a
      // slowed-down version of the same choreography. The portrait's
      // scroll-parallax never engages either way — it's gated the same
      // breakpoint/reduced-motion query as horizontal-scroll.tsx's own
      // pin+scrub, which simply never activates here — so it only needs
      // its plain resting state, no scroll wiring.
      gsap.set(letters, { autoAlpha: 1, y: 0 });
      gsap.set(name, { x: 0, y: 0, scale: 1, columnGap: restingColumnGap });
      gsap.set(circle, { scale: 1 });
      gsap.set(portrait, { autoAlpha: 1, x: 0, filter: "none" });
      greetingBubbleRef.current?.setActive(true);
      aboutBubbleRef.current?.setActive(true);
      setIntroPhase("idle");
      return cleanupFit;
    }

    // Sets up the portrait's post-entrance behavior: its horizontal position
    // mapped to scroll, slower/laggier than the rest of the page (see
    // PORTRAIT_PARALLAX_FACTOR/SCRUB above), and its own "nears the screen
    // edge → frosts and fades out" exit — the entrance played in reverse.
    // Deferred to a plain function (rather than inlined in the timeline's
    // `.call()` below) purely so the logic below reads top-to-bottom instead
    // of nested inside the timeline chain.
    //
    // Gated to the same "wide enough + no reduced motion" query horizontal-
    // scroll.tsx uses for its own pin+scrub, via its own `gsap.matchMedia` —
    // not because it needs to re-derive that component's state, but because
    // JS and CSS (and now this) should never disagree about which mode is
    // active, and a visitor who resizes across the breakpoint mid-session
    // should still get this torn down/rebuilt correctly like everything
    // else gated the same way.
    //
    // Created once, from the timeline's own `.call()` below, i.e. strictly
    // after the hero text and the about-me circle have both finished — not
    // on mount — per the brief ("Then from there it should be mapped to the
    // scroll wheel").
    const setupPortraitScroll = () => {
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
        () => {
          const track = portrait.closest<HTMLElement>(
            ".horizontal-scroll__track",
          );
          const section = portrait.closest<HTMLElement>(".horizontal-scroll");
          if (!track || !section) return;

          const distance = () => track.scrollWidth - window.innerWidth;
          if (distance() <= 0) return;

          // The portrait's own scrub has to span EXACTLY the same page-
          // scroll pixel range as the main pin+scrub above (see
          // horizontal-scroll.tsx) — the parallax math (PORTRAIT_PARALLAX_
          // FACTOR's own comment above) only cancels out correctly when
          // both tweens' ScrollTrigger progress (0→1) advances in lockstep.
          // Re-deriving that range independently via `start: "top top"` is
          // NOT safe here: confirmed live (console logging the created
          // ScrollTrigger's own `.start`/`.end`), GSAP's "top top"
          // shorthand mismeasures by exactly +distance() when a second
          // ScrollTrigger is created — as this one deliberately is, from
          // this timeline's own `.call()`, strictly AFTER the main pin
          // ScrollTrigger already exists — on the very same trigger
          // element an existing `pin: true` ScrollTrigger already pinned.
          // It appears to pick up that pin's fully-scrolled measurement
          // pass (used internally to size the pin spacer) instead of its
          // resting one. Reading the main pin's OWN already-correct
          // `.start`/`.end` directly sidesteps the bug entirely — whatever
          // it is, by construction, is the right answer, and this can
          // never drift from it even if the underlying GSAP quirk changes.
          const mainPin = () =>
            ScrollTrigger.getAll().find(
              (st) => st.trigger === section && st.pin,
            );
          const pinStart = () => mainPin()?.start ?? 0;

          // Measured once, here — not via getBoundingClientRect() on every
          // scrub frame — same reasoning as horizontal-scroll.tsx's own
          // `measureFadeTargets`: track's `x` and the portrait's own `x`
          // (still 0 at this point, right after the entrance tween settled
          // it there) are both known, so the portrait's position at any
          // later frame is just `restLeft + track's x + portrait's own x`,
          // pure arithmetic rather than a forced layout every frame.
          let restLeft = 0;
          let lastExitProgress = -1;

          const measure = () => {
            const trackX = (gsap.getProperty(track, "x") as number) || 0;
            const ownX = (gsap.getProperty(portrait, "x") as number) || 0;
            restLeft = portrait.getBoundingClientRect().left - trackX - ownX;
            // Forces the very next frame to always paint regardless of what
            // it computes, same "-1 is an impossible progress" trick as
            // horizontal-scroll.tsx's FadeTarget.lastProgress.
            lastExitProgress = -1;
          };
          measure();

          // The portrait's own "nears the edge → frosts + fades" exit,
          // mirroring horizontal-scroll.tsx's applyExitFade but computed
          // from this element's REAL current position — restLeft plus BOTH
          // the track's motion and this element's own parallax offset,
          // since the generic data-scroll-fade system only ever accounts
          // for the former.
          const applyExitFrost = () => {
            const trackX = (gsap.getProperty(track, "x") as number) || 0;
            const ownX = (gsap.getProperty(portrait, "x") as number) || 0;
            const left = restLeft + trackX + ownX;
            const barrierX = window.innerWidth * PORTRAIT_FADE_BARRIER;
            const diffusionPx = window.innerWidth * PORTRAIT_FADE_DIFFUSION;
            const exitProgress = gsap.utils.clamp(
              0,
              1,
              (barrierX - left) / diffusionPx,
            );
            if (exitProgress === lastExitProgress) return;
            const wasActive =
              lastExitProgress > 0 && lastExitProgress < 1;
            const isActive = exitProgress > 0 && exitProgress < 1;
            lastExitProgress = exitProgress;

            portrait.style.opacity =
              exitProgress === 0 ? "" : String(1 - exitProgress);
            portrait.style.filter =
              exitProgress > 0
                ? `blur(${(exitProgress * PORTRAIT_FADE_MAX_BLUR_PX).toFixed(2)}px)`
                : "";
            if (isActive !== wasActive) {
              portrait.style.willChange = isActive
                ? "opacity, filter, transform"
                : "transform";
            }
          };

          // `x` target is `distance() * (1 - PORTRAIT_PARALLAX_FACTOR)`, not
          // `-distance()` like the main track — a POSITIVE offset that
          // partially cancels the leftward motion the portrait inherits
          // automatically just by sitting inside the track (it's a normal
          // descendant of `.horizontal-scroll__track`, so the track's own
          // translation already carries it along at full speed before this
          // tween adds anything). Net on-screen motion works out to exactly
          // `trackX * PORTRAIT_PARALLAX_FACTOR` — see the constant's own
          // comment above for the arithmetic. `scrub` is independently
          // tunable from the main track's (`PORTRAIT_PARALLAX_SCRUB`,
          // typically larger) for the "lingers" lag on top of that slower
          // travel distance.
          const tween = gsap.to(portrait, {
            x: () => distance() * (1 - PORTRAIT_PARALLAX_FACTOR),
            ease: "none",
            onUpdate: applyExitFrost,
            scrollTrigger: {
              trigger: section,
              start: pinStart,
              end: () => pinStart() + distance(),
              scrub: PORTRAIT_PARALLAX_SCRUB,
              invalidateOnRefresh: true,
            },
          });

          const handleResize = () => {
            measure();
            applyExitFrost();
          };
          window.addEventListener("resize", handleResize);

          // Runs when the query above stops matching (resize under 901px,
          // or reduced-motion switched on mid-visit) or on unmount — resets
          // the portrait to its plain resting state so neither the vertical-
          // stack fallback nor a later remount ever inherits a stuck
          // parallax offset or frost from wherever scroll was left.
          return () => {
            window.removeEventListener("resize", handleResize);
            tween.scrollTrigger?.kill();
            tween.kill();
            gsap.set(portrait, { x: 0 });
            portrait.style.opacity = "";
            portrait.style.filter = "";
            portrait.style.willChange = "";
          };
        },
      );
    };

    // ---- the opening sequence ----
    // Measured against the name's own resting layout — useGSAP runs as a
    // layout effect, so this element already has its real final size/
    // position from normal flow by this point, just before the browser
    // paints. Translating its own center to the viewport's center and then
    // scaling down around that same center is what makes "smaller, in the
    // middle of the page" work at any viewport size with no hand-tuned
    // breakpoints, the same "measure, don't guess" approach components/
    // scroll-memory.tsx uses ScrollTrigger.refresh() for.
    const rect = name.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    gsap.set(name, { x: dx, y: dy, scale: INTRO_START_SCALE, columnGap: 0 });
    gsap.set(letters, { autoAlpha: 0, y: 24 });
    gsap.set(circle, { scale: 0 });
    // Starts offset to the right of its resting spot, frosted (blurred) and
    // invisible — see PORTRAIT_ENTRANCE_OFFSET_X/BLUR_PX above for the
    // tunable amounts.
    gsap.set(portrait, {
      autoAlpha: 0,
      x: PORTRAIT_ENTRANCE_OFFSET_X,
      filter: `blur(${PORTRAIT_ENTRANCE_BLUR_PX}px)`,
    });

    gsap
      .timeline()
      .to(letters, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.035,
        ease: "power3.out",
      })
      // Fires the instant the letters finish appearing — chrome fades in
      // over the same stretch of time as the name settling into place
      // below, per the brief ("[they] should animate in as the words
      // scale up and move down to their place").
      .call(() => setIntroPhase("revealing"))
      .to(name, { x: 0, y: 0, scale: 1, duration: 0.9, ease: "power3.inOut" }, "<")
      // The "push apart" moment: the circle grows in and the gap it sits
      // inside of opens up from 0 to its resting width at the same time,
      // same duration, same elastic ease — one motion read as the circle
      // shoving the words outward rather than two coincidentally-timed
      // animations.
      .to(circle, { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.5)" })
      .to(name, { columnGap: restingColumnGap, duration: 0.9, ease: "elastic.out(1, 0.5)" }, "<")
      .call(() => setIntroPhase("idle"))
      // The portrait's own entrance — slide-in-from-the-right-of-center +
      // fade + deblur — starts only once the above (hero text AND the
      // about-me circle) has fully settled, per the brief, and its scroll
      // mapping is wired up only once THIS has finished too.
      .to(portrait, {
        autoAlpha: 1,
        x: 0,
        filter: "blur(0px)",
        duration: PORTRAIT_ENTRANCE_DURATION,
        ease: PORTRAIT_ENTRANCE_EASE,
        // Drop the (now no-op) `blur(0px)` once settled: any non-`none`
        // filter keeps the whole portrait on a filter render path, which
        // would otherwise be re-run whenever the speech bubble (a child of
        // the portrait) animates.
        clearProps: "filter",
      })
      // Speech bubbles are armed only once the portrait has fully appeared.
      // From here on each shows/hides itself from scroll position (see
      // GREETING_/ABOUT_BUBBLE_VISIBLE above).
      .call(() => {
        greetingBubbleRef.current?.setActive(true);
        aboutBubbleRef.current?.setActive(true);
      })
      .call(setupPortraitScroll);

    return cleanupFit;
  }, []);

  const setRimTimeScale = (target: number, duration: number) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const tween = rimTweenRef.current;
    if (!tween) return;
    gsap.to(tween, { timeScale: target, duration });
  };

  return (
    <section aria-label="Introduction" className="hero" data-chrome-tone="light-on-dark">
      {/* Purely decorative — sits behind .hero-name (see hero.css's z-index
          stacking) and never carries content of its own, so it's hidden
          from assistive tech entirely rather than given empty/redundant
          alt text. `fill` + the wrapper's own fixed size (hero.css) lets
          next/image pick whichever generated size actually fills it;
          `priority` so the (large) source is already fetched/decoded by
          the time its entrance tween fires a couple seconds in, rather
          than popping in mid-animation. */}
      <div className="hero-portrait" ref={portraitRef} aria-hidden="true">
        {/* Rounded-corner clipping lives on this inner frame rather than on
            .hero-portrait itself, so the speech bubble (a sibling, below)
            can overhang the photo's edge without being clipped. The bubble
            is a child of the portrait so it inherits the portrait's own
            entrance/parallax transforms and scales with it for free. */}
        <div className="hero-portrait__frame">
          <Image
            src={PORTRAIT_SRC}
            alt=""
            fill
            priority
            sizes="(min-width: 901px) 40vw, 70vw"
            className="hero-portrait__img"
          />
        </div>
        <SpeechBubble
          ref={greetingBubbleRef}
          side="left"
          className="hero-portrait__bubble hero-portrait__bubble--greeting"
          script={greetingScript}
          visibleWhile={GREETING_BUBBLE_VISIBLE}
        />
        <SpeechBubble
          ref={aboutBubbleRef}
          side="right"
          className="hero-portrait__bubble hero-portrait__bubble--about"
          script={aboutScript}
          visibleWhile={ABOUT_BUBBLE_VISIBLE}
        />
      </div>
      <div className="hero-name" ref={nameRef}>
        {/* The one accessible reading of this heading — plain text, no
            per-letter markup. The animated letters below are a decorative
            duplicate (aria-hidden), same "invisible sizer / visible copy"
            split already used by components/chrome-tone-mask.tsx. */}
        <h1 className="hero-name__sr-only">Jon cheng</h1>
        <HeroWord
          word="Jon"
          wordRef={jonWordRef}
          onLetterRef={(i, el) => {
            jonLettersRef.current[i] = el;
          }}
        />
        <TransitionLink
          href="/me"
          className="hero-circle"
          data-scroll-fade
          data-cursor="enter"
          ref={circleRef}
          aria-label="More about me"
          onMouseEnter={() => setRimTimeScale(RIM_HOVER_TIMESCALE, 0.4)}
          onMouseLeave={() => setRimTimeScale(1, 0.6)}
        >
          <svg
            ref={rimRef}
            className="hero-circle__rim"
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <path
              id="hero-rim-path"
              d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"
              fill="none"
            />
            <text className="hero-circle__rim-text">
              <textPath href="#hero-rim-path" startOffset="0%">
                {RIM_LOOP}
              </textPath>
            </text>
          </svg>
        </TransitionLink>
        <HeroWord
          word="cheng"
          wordRef={chengWordRef}
          onLetterRef={(i, el) => {
            chengLettersRef.current[i] = el;
          }}
        />
      </div>
    </section>
  );
}
