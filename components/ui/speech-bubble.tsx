"use client";

// Self-sizing dialogue bubble: elastic resize per line, scripted dialogue, scroll-range visibility.
// Fits: used on the hero portrait. Position/size/font via consumer CSS class; lines via `script`.

import { useImperativeHandle, useRef, type Ref } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import "./speech-bubble.css";

/** holdSeconds overrides reading-time hold. */
export type SpeechBubbleLine = { text: string; holdSeconds?: number };

/** Script input. reason: show (popping in) | advance (hold elapsed). */
export type SpeechBubbleContext = {
  reason: "show" | "advance";
  appearance: number;
  lineInAppearance: number;
  totalLines: number;
  idleSeconds: number;
  current: string | null;
};

/** Returns next line, or null = stay quiet (re-asked every QUIET_RECHECK_SECONDS). */
export type SpeechBubbleScript = (
  ctx: SpeechBubbleContext,
) => SpeechBubbleLine | string | null;

/** Ref API. setActive(true) arms it; shows only while armed + in visibleWhile. */
export type SpeechBubbleHandle = {
  setActive: (active: boolean) => void;
};

/** Scroll px, or fn → px. */
export type ScrollBound = number | (() => number);

/** Script that loops a fixed list. */
export function cycleScript(
  lines: readonly (SpeechBubbleLine | string)[],
): SpeechBubbleScript {
  let i = -1;
  return ({ reason, current }) => {
    if (lines.length === 0) return null;
    if (reason === "show" && current !== null) return null;
    i = (i + 1) % lines.length;
    return lines[i];
  };
}

/** Scales every reading-time hold. */
const DIALOGUE_SPEED_MULTIPLIER = 2;

/** Default hold: base + per word/char, clamped, × multiplier. */
export function readingHoldSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const hold = gsap.utils.clamp(3, 8, 2.2 + words * 0.4 + text.length * 0.025);
  return hold * DIALOGUE_SPEED_MULTIPLIER;
}

/** Re-ask delay after script returns null. */
const QUIET_RECHECK_SECONDS = 0.4;

/** Motion knobs: text swap, elastic resize, squash, pop in/out. */
const TEXT_OUT_DURATION = 0.16;
const TEXT_IN_DELAY = 0.1;
const TEXT_IN_DURATION = 0.3;
const RESIZE_DURATION = 0.95;
const RESIZE_EASE = "elastic.out(1, 0.35)";
const SQUASH_STRENGTH = 0.32;
const SQUASH_IN_DURATION = 0.12;
const SQUASH_RECOVER_DURATION = 0.85;
const SQUASH_RECOVER_EASE = "elastic.out(1, 0.3)";
const SHOW_DURATION = 0.9;
const SHOW_EASE = "elastic.out(1, 0.45)";
const SHOW_FROM_SCALE = 0.25;
const SHOW_FROM_ROTATION = 10;
const HIDE_DURATION = 0.22;

/** Shared idle tracker (one listener set for all bubbles). */
let lastActivity = 0;
let activityUsers = 0;
const markActive = () => {
  lastActivity = performance.now();
};
const ACTIVITY_EVENTS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
function retainActivityTracker() {
  if (activityUsers++ === 0) {
    markActive();
    for (const e of ACTIVITY_EVENTS) {
      window.addEventListener(e, markActive, { passive: true });
    }
  }
  return () => {
    if (--activityUsers === 0) {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, markActive);
    }
  };
}

const resolveBound = (b: ScrollBound | undefined, fallback: number) =>
  b === undefined ? fallback : typeof b === "function" ? b() : b;

/** script | messages; side = which side of anchor; visibleWhile = scroll px range. */
type Props = {
  script?: SpeechBubbleScript;
  messages?: readonly (SpeechBubbleLine | string)[];
  side?: "left" | "right";
  visibleWhile?: { from?: ScrollBound; to?: ScrollBound };
  className?: string;
  ref?: Ref<SpeechBubbleHandle>;
};

/** Zero re-renders after mount; sizes measured from a hidden copy. */
export function SpeechBubble({
  script,
  messages,
  side = "left",
  visibleWhile,
  className,
  ref,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  const activeRef = useRef(false);
  const applyActiveRef = useRef<((active: boolean) => void) | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      setActive: (active: boolean) => {
        activeRef.current = active;
        applyActiveRef.current?.(active);
      },
    }),
    [],
  );

  useGSAP(
    () => {
      const measureEl = measureRef.current;
      const pop = popRef.current;
      const body = bodyRef.current;
      const textEl = textRef.current;
      const lineEl = lineRef.current;
      if (!measureEl || !pop || !body || !textEl || !lineEl) return;

      const run: SpeechBubbleScript | null =
        script ?? (messages ? cycleScript(messages) : null);
      if (!run) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const rotSign = side === "left" ? -1 : 1;

      const releaseActivity = retainActivityTracker();

      let active = activeRef.current;
      let inRange = false;
      let shown = false;
      let swapping = false;
      let current: string | null = null;
      let currentHold = QUIET_RECHECK_SECONDS;
      let appearance = 0;
      let lineInAppearance = 0;
      let totalLines = 0;
      let holdCall: gsap.core.Tween | null = null;
      let swapTl: gsap.core.Timeline | null = null;

      const ask = (reason: SpeechBubbleContext["reason"]) => {
        const out = run({
          reason,
          appearance,
          lineInAppearance,
          totalLines,
          idleSeconds: (performance.now() - lastActivity) / 1000,
          current,
        });
        if (out === null) return null;
        const line = typeof out === "string" ? { text: out } : out;
        return {
          text: line.text,
          hold: line.holdSeconds ?? readingHoldSeconds(line.text),
        };
      };

      const range = document.createRange();
      const measure = () => {
        const box = measureEl.getBoundingClientRect();
        let widestLine = 0;
        if (measureEl.firstChild) {
          range.selectNodeContents(measureEl);
          for (const r of range.getClientRects()) {
            if (r.width > widestLine) widestLine = r.width;
          }
        }
        const cs = getComputedStyle(measureEl);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const hug = widestLine > 0 ? Math.min(box.width, widestLine + padX) : box.width;
        return {
          w: Math.ceil(hug),
          h: Math.ceil(box.height),
          textW: Math.ceil(box.width),
        };
      };

      const applyTextSize = (size: { w: number; h: number; textW: number }) => {
        gsap.set(textEl, { width: size.w, height: size.h, marginTop: -size.h / 2 });
        gsap.set(lineEl, { width: size.textW, height: size.h });
      };

      const applySize = (size: { w: number; h: number; textW: number }) => {
        gsap.set(body, { width: size.w, height: size.h });
        applyTextSize(size);
      };

      const snapToCurrentSize = () => {
        const size = measure();
        if (size.w <= 0 || size.h <= 0) return;
        applySize(size);
      };

      const setTextInstantly = (text: string) => {
        current = text;
        measureEl.textContent = text;
        lineEl.textContent = text;
        snapToCurrentSize();
        gsap.set(textEl, { autoAlpha: 1, yPercent: 0, scale: 1 });
      };

      gsap.set(pop, {
        autoAlpha: 0,
        scale: reduceMotion ? 1 : SHOW_FROM_SCALE,
        rotation: reduceMotion ? 0 : SHOW_FROM_ROTATION * rotSign,
        transformOrigin: side === "left" ? "100% 50%" : "0% 50%",
      });

      const schedule = (seconds: number) => {
        holdCall?.kill();
        holdCall = null;
        if (!shown || swapping) return;
        holdCall = gsap.delayedCall(seconds, advance);
      };

      const say = (text: string, hold: number) => {
        const fromW = (gsap.getProperty(body, "width") as number) || 1;
        const fromH = (gsap.getProperty(body, "height") as number) || 1;

        swapping = true;
        current = text;
        currentHold = hold;
        lineInAppearance++;
        totalLines++;
        measureEl.textContent = text;
        const to = measure();

        const tl = gsap.timeline({
          onComplete: () => {
            swapping = false;
            swapTl = null;
            snapToCurrentSize();
            schedule(currentHold);
          },
        });
        swapTl = tl;

        if (reduceMotion) {
          tl
            .to(textEl, { autoAlpha: 0, duration: 0.2, ease: "power1.out" })
            .call(() => {
              lineEl.textContent = text;
              applySize(to);
            })
            .to(textEl, { autoAlpha: 1, duration: 0.2, ease: "power1.in" });
          return;
        }

        const widthChange = gsap.utils.clamp(-1, 1, to.w / fromW - 1);
        const heightChange = gsap.utils.clamp(-1, 1, to.h / fromH - 1);

        const SIGNIFICANT = 0.01;
        const tweenAxis = (
          prop: "width" | "height",
          target: number,
          ownChange: number,
          otherChange: number,
        ) => {
          if (Math.abs(ownChange) > SIGNIFICANT || Math.abs(otherChange) <= SIGNIFICANT) {
            tl.to(body, { [prop]: target, duration: RESIZE_DURATION, ease: RESIZE_EASE }, "resize");
            return;
          }
          const squashed = target * (1 - SQUASH_STRENGTH * otherChange);
          tl
            .to(body, { [prop]: squashed, duration: SQUASH_IN_DURATION, ease: "power2.out" }, "resize")
            .to(
              body,
              { [prop]: target, duration: SQUASH_RECOVER_DURATION, ease: SQUASH_RECOVER_EASE },
              `resize+=${SQUASH_IN_DURATION}`,
            );
        };

        tl
          .to(textEl, {
            autoAlpha: 0,
            yPercent: -25,
            scale: 0.92,
            duration: TEXT_OUT_DURATION,
            ease: "power2.in",
          })
          .call(() => {
            lineEl.textContent = text;
            applyTextSize(to);
          })
          .addLabel("resize");
        tweenAxis("width", to.w, widthChange, heightChange);
        tweenAxis("height", to.h, heightChange, widthChange);
        tl.fromTo(
          textEl,
          { autoAlpha: 0, yPercent: 12, scale: 0.97 },
          { autoAlpha: 1, yPercent: 0, scale: 1, duration: TEXT_IN_DURATION, ease: "power2.out" },
          `resize+=${TEXT_IN_DELAY}`,
        );
      };

      const advance = () => {
        holdCall = null;
        if (!shown) return;
        const next = ask("advance");
        if (!next || next.text === current) {
          schedule(QUIET_RECHECK_SECONDS);
          return;
        }
        say(next.text, next.hold);
      };

      const sync = () => {
        const shouldShow = active && inRange;
        if (shouldShow === shown) return;
        shown = shouldShow;

        if (shouldShow) {
          appearance++;
          lineInAppearance = 0;
          const interruptedSwap = swapTl !== null;
          if (swapTl) {
            swapTl.kill();
            swapTl = null;
            swapping = false;
          }
          const opener = ask("show");
          if (!opener && interruptedSwap && current !== null) {
            setTextInstantly(current);
          }
          if (opener) {
            setTextInstantly(opener.text);
            currentHold = opener.hold;
            lineInAppearance = 1;
            totalLines++;
          } else if (current === null) {
            shown = false;
            appearance--;
            return;
          }

          if (reduceMotion) {
            gsap.to(pop, { autoAlpha: 1, duration: 0.25, overwrite: "auto" });
          } else {
            if ((gsap.getProperty(pop, "opacity") as number) === 0) {
              gsap.set(pop, { scale: SHOW_FROM_SCALE, rotation: SHOW_FROM_ROTATION * rotSign });
            }
            gsap.to(pop, { autoAlpha: 1, duration: 0.18, ease: "none", overwrite: "auto" });
            gsap.to(pop, {
              scale: 1,
              rotation: 0,
              duration: SHOW_DURATION,
              ease: SHOW_EASE,
              overwrite: "auto",
            });
          }
          schedule(currentHold);
        } else {
          holdCall?.kill();
          holdCall = null;
          gsap.to(pop, {
            autoAlpha: 0,
            scale: reduceMotion ? 1 : 0.6,
            duration: HIDE_DURATION,
            ease: "power2.in",
            overwrite: "auto",
          });
        }
      };

      applyActiveRef.current = (next) => {
        active = next;
        sync();
      };

      const computeInRange = () => {
        if (!visibleWhile) return true;
        const y = window.scrollY;
        return (
          y >= resolveBound(visibleWhile.from, -Infinity) &&
          y < resolveBound(visibleWhile.to, Infinity)
        );
      };
      inRange = computeInRange();
      const onScroll = () => {
        const next = computeInRange();
        if (next === inRange) return;
        inRange = next;
        sync();
      };
      if (visibleWhile) {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
      }

      const ro = new ResizeObserver(() => {
        if (!swapping) snapToCurrentSize();
      });
      ro.observe(measureEl);

      sync();

      return () => {
        applyActiveRef.current = null;
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        releaseActivity();
        ro.disconnect();
        holdCall?.kill();
        swapTl?.kill();
        gsap.killTweensOf([pop, body, textEl]);
      };
    },
    {
      scope: rootRef,
      dependencies: [script, messages, side, visibleWhile],
      revertOnUpdate: true,
    },
  );

  return (
    <div
      ref={rootRef}
      className={className ? `speech-bubble ${className}` : "speech-bubble"}
      data-side={side}
    >
      <span ref={measureRef} className="speech-bubble__measure" aria-hidden="true" />
      <div className="speech-bubble__anchor">
        <div ref={popRef} className="speech-bubble__pop">
          <div ref={bodyRef} className="speech-bubble__body">
            <span ref={textRef} className="speech-bubble__text">
              <span ref={lineRef} className="speech-bubble__line" />
            </span>
          </div>
          <svg
            className="speech-bubble__tail"
            viewBox="0 0 12 16"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 0 C3 5 7 7.2 12 8 C7 8.8 3 11 0 16 Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
