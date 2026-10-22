"use client";

// Home hero: name wordmark + about circle (actor "hero"), sorrento.png + speech bubbles (actor "portrait").
// Fits: rendered in app/page.tsx Scene. Position/scroll motion → home.choreo.ts. Owns: content, one-off intro animation, size fits.

import { useRef, useState, type MutableRefObject, type Ref } from "react";
import Image from "next/image";
import { TransitionLink } from "@/components/transition-link";
import { Actor } from "@/components/choreo";
import {
  SpeechBubble,
  type SpeechBubbleHandle,
  type ScrollBound,
} from "@/components/ui/speech-bubble";
import { gsap, useGSAP } from "@/lib/gsap";
import { setIntroPhase } from "@/lib/intro-store";
import { BUBBLES, PORTRAIT } from "../../home.choreo";
import { createAboutScript, createGreetingScript } from "./dialogue";
import { fitNameToWidth } from "./fit-name";
import "./hero.css";

const PORTRAIT_SRC = "/sorrento.png";

const PORTRAIT_ASPECT_RATIO = PORTRAIT.aspect;
const PORTRAIT_TOP_OFFSET_PX = PORTRAIT.top;
const PORTRAIT_OVERLAP_FRACTION = PORTRAIT.overlap;

/** Intro: portrait slides in from this many px right. */
const PORTRAIT_ENTRANCE_OFFSET_X = 120;

/** Intro: starting blur px. */
const PORTRAIT_ENTRANCE_BLUR_PX = 24;

/** Intro timing (s) + ease. */
const PORTRAIT_ENTRANCE_DURATION = 1.1;
const PORTRAIT_ENTRANCE_EASE = "power3.out";

/** Screens of scroll → px (for SpeechBubble visibleWhile). */
const screens = (n: number): ScrollBound => () => window.innerHeight * n;
const GREETING_BUBBLE_VISIBLE = { to: screens(BUBBLES.greeting.to) };
const ABOUT_BUBBLE_VISIBLE = {
  from: screens(BUBBLES.about.from),
  to: screens(BUBBLES.about.to),
};

/** Circle rim label; looped twice for a seamless rotation. */
const RIM_TEXT = "MORE ABOUT ME";
const RIM_LOOP = `${RIM_TEXT} • ${RIM_TEXT} • `;

/** Rim: seconds per turn; hover speed-up multiplier. */
const RIM_ROTATION_SECONDS = 20;
const RIM_HOVER_TIMESCALE = 4;

/** Intro: name starts this small, centered. */
const INTRO_START_SCALE = 0.42;

type LetterRefSetter = (index: number, el: HTMLSpanElement | null) => void;

/** One word, split into letters for the intro stagger. aria-hidden (sr-only h1 carries the name). */
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
          style={{ display: "inline-block" }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

/** Renders actors "portrait" + "hero". Intro timeline; fits name to width, portrait to name. */
export function Hero() {
  const nameRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLAnchorElement>(null);
  const rimRef = useRef<SVGSVGElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const greetingBubbleRef = useRef<SpeechBubbleHandle>(null);
  const aboutBubbleRef = useRef<SpeechBubbleHandle>(null);
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

    /** Name font-size so "Jon ● cheng" exactly fills the width. Re-run on resize/font load. */
    const fitHeroSizeToWidth = () => fitNameToWidth(name, [jonWord, circle, chengWord]);

    /** Portrait width from PORTRAIT top/overlap/aspect + name position. Writes --sorrento-size on its actor. */
    const fitPortraitToHeroOverlap = () => {
      const top = PORTRAIT_TOP_OFFSET_PX;
      const bottom = name.offsetTop + name.offsetHeight * PORTRAIT_OVERLAP_FRACTION;
      const height = bottom - top;
      if (height <= 0) return;
      const width = height * PORTRAIT_ASPECT_RATIO;
      const box = portrait.parentElement ?? portrait;
      box.style.setProperty("--sorrento-top", `${top}px`);
      box.style.setProperty("--sorrento-size", `${width}px`);
    };

    const fitLayout = () => {
      fitHeroSizeToWidth();
      fitPortraitToHeroOverlap();
    };

    fitLayout();
    window.addEventListener("resize", fitLayout);
    document.fonts?.ready?.then(fitLayout);
    const cleanupFit = () => window.removeEventListener("resize", fitLayout);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setIntroPhase("hidden");

    if (rim && !prefersReducedMotion) {
      rimTweenRef.current = gsap.to(rim, {
        rotation: 360,
        duration: RIM_ROTATION_SECONDS,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
    }

    const restingColumnGap = getComputedStyle(name).columnGap;

    if (prefersReducedMotion) {
      gsap.set(letters, { autoAlpha: 1, y: 0 });
      gsap.set(name, { x: 0, y: 0, scale: 1, columnGap: restingColumnGap });
      gsap.set(circle, { scale: 1 });
      gsap.set(portrait, { autoAlpha: 1, x: 0, filter: "none" });
      greetingBubbleRef.current?.setActive(true);
      aboutBubbleRef.current?.setActive(true);
      setIntroPhase("idle");
      return cleanupFit;
    }

    const rect = name.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    gsap.set(name, { x: dx, y: dy, scale: INTRO_START_SCALE, columnGap: 0 });
    gsap.set(letters, { autoAlpha: 0, y: 24 });
    gsap.set(circle, { scale: 0 });
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
      .call(() => setIntroPhase("revealing"))
      .to(name, { x: 0, y: 0, scale: 1, duration: 0.9, ease: "power3.inOut" }, "<")
      .to(circle, { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.5)" })
      .to(name, { columnGap: restingColumnGap, duration: 0.9, ease: "elastic.out(1, 0.5)" }, "<")
      .call(() => setIntroPhase("idle"))
      .to(portrait, {
        autoAlpha: 1,
        x: 0,
        filter: "blur(0px)",
        duration: PORTRAIT_ENTRANCE_DURATION,
        ease: PORTRAIT_ENTRANCE_EASE,
        clearProps: "filter",
      })
      .call(() => {
        greetingBubbleRef.current?.setActive(true);
        aboutBubbleRef.current?.setActive(true);
      });

    return cleanupFit;
  }, []);

  const setRimTimeScale = (target: number, duration: number) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const tween = rimTweenRef.current;
    if (!tween) return;
    gsap.to(tween, { timeScale: target, duration });
  };

  return (
    <>
      <Actor id="portrait" className="hero-portrait-actor">
        <div className="hero-portrait" ref={portraitRef} aria-hidden="true">
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
      </Actor>

      <Actor id="hero" className="hero-actor">
        <section aria-label="Introduction" className="hero" data-chrome-tone="light-on-dark">
          <div className="hero-name" ref={nameRef}>
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
      </Actor>
    </>
  );
}
