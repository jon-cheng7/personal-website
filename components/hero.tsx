"use client";

import { useRef, type MutableRefObject } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import { setIntroPhase } from "@/lib/intro-store";
import "./hero.css";

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
 * `data-scroll-fade`: opts this word into components/horizontal-scroll.tsx's
 * per-element frosted-glass exit fade — each word (and the circle, see the
 * render below) has its own horizontal position within the Hero panel, so
 * marking them individually is what makes "Jon" start fading before "cheng"
 * does as the panel scrolls out, rather than the whole panel dissolving as
 * one flat block. */
function HeroWord({
  word,
  onLetterRef,
}: {
  word: string;
  onLetterRef: LetterRefSetter;
}) {
  return (
    <span className="hero-name__word" data-scroll-fade aria-hidden="true">
      {word.split("").map((char, i) => (
        <span
          key={i}
          ref={(el) => onLetterRef(i, el)}
          className="hero-letter"
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
  const rimTweenRef: MutableRefObject<gsap.core.Tween | null> = useRef(null);
  const jonLettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const chengLettersRef = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(() => {
    const name = nameRef.current;
    const circle = circleRef.current;
    const rim = rimRef.current;
    if (!name || !circle) return;

    const letters = [...jonLettersRef.current, ...chengLettersRef.current].filter(
      (el): el is HTMLSpanElement => el !== null,
    );

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
      // slowed-down version of the same choreography.
      gsap.set(letters, { autoAlpha: 1, y: 0 });
      gsap.set(name, { x: 0, y: 0, scale: 1, columnGap: restingColumnGap });
      gsap.set(circle, { scale: 1 });
      setIntroPhase("idle");
      return;
    }

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
      .call(() => setIntroPhase("idle"));
  }, []);

  const setRimTimeScale = (target: number, duration: number) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const tween = rimTweenRef.current;
    if (!tween) return;
    gsap.to(tween, { timeScale: target, duration });
  };

  return (
    <section aria-label="Introduction" className="hero" data-chrome-tone="light-on-dark">
      <div className="hero-name" ref={nameRef}>
        {/* The one accessible reading of this heading — plain text, no
            per-letter markup. The animated letters below are a decorative
            duplicate (aria-hidden), same "invisible sizer / visible copy"
            split already used by components/chrome-tone-mask.tsx. */}
        <h1 className="hero-name__sr-only">Jon cheng</h1>
        <HeroWord
          word="Jon"
          onLetterRef={(i, el) => {
            jonLettersRef.current[i] = el;
          }}
        />
        <Link
          href="/me"
          className="hero-circle"
          data-scroll-fade
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
        </Link>
        <HeroWord
          word="cheng"
          onLetterRef={(i, el) => {
            chengLettersRef.current[i] = el;
          }}
        />
      </div>
    </section>
  );
}
