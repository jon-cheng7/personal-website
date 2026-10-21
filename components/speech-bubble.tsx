"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import "./speech-bubble.css";

// ---------------------------------------------------------------------------
// SpeechBubble — a small, self-sizing dialogue bubble that says a sequence of
// lines, elastically stretching/squashing its body to fit each new one.
// Used twice on the Home hero (components/hero.tsx) — one each side of the
// portrait — but nothing in here is Hero-specific: WHERE the bubble sits, its
// font-size and max-width are the consumer's CSS (see `.hero-portrait__bubble`
// in hero.css), WHAT it says is a script (see lib/hero-dialogue.ts), and
// WHEN it's visible is the `visibleWhile` scroll range + `setActive()`.
//
// Performance notes:
// - Zero React re-renders after mount. Text, size and visibility are all
//   driven imperatively (GSAP + textContent).
// - Sizes are MEASURED, never guessed: a hidden in-flow "measure" copy of the
//   text (same font/padding/max-width) is laid out by the browser, read once
//   per line change, and the visible body tweens to that size. One
//   ResizeObserver on that copy catches every other reason the target size
//   could change (viewport resize, web-font swap) — no per-frame reads.
// - The animated body sits on its own compositor layer (`will-change` on
//   `.speech-bubble__pop`), so its width/height tweens only repaint that
//   small box — never the portrait image it floats over. `contain: layout
//   style` on the root keeps the layout work from escaping the bubble.
// - Global listeners are passive and O(1): one `scroll` handler that only
//   does work when the in-range state FLIPS, plus one shared (module-level,
//   ref-counted) activity tracker that just stores a timestamp.
// ---------------------------------------------------------------------------

/** One line of dialogue. `holdSeconds` overrides the automatic
 * reading-time-based hold (see `readingHoldSeconds`). */
export type SpeechBubbleLine = { text: string; holdSeconds?: number };

/** What a script gets to decide its next line with. */
export type SpeechBubbleContext = {
  /** "show": the bubble is about to pop in (return a line to open with, or
   * null to keep whatever it last said). "advance": the current line's hold
   * has elapsed (return the next line, or null to stay quiet for now — the
   * script will be asked again after `QUIET_RECHECK_SECONDS`). */
  reason: "show" | "advance";
  /** 1 the first time the bubble is ever shown, 2 the next time, … */
  appearance: number;
  /** Lines said during the current appearance so far (0 on "show"). */
  lineInAppearance: number;
  /** Lines said across all appearances. */
  totalLines: number;
  /** Seconds since the visitor last moved the pointer, scrolled, touched or
   * pressed a key. */
  idleSeconds: number;
  /** The line currently in the bubble, if any. */
  current: string | null;
};

/** A dialogue script: called whenever the bubble needs to know what to say
 * next. Can be stateful (a closure) — create one per bubble instance. */
export type SpeechBubbleScript = (
  ctx: SpeechBubbleContext,
) => SpeechBubbleLine | string | null;

export type SpeechBubbleHandle = {
  /** Arms (or disarms) the bubble. It only actually SHOWS while armed AND
   * the scroll position is inside `visibleWhile`. Safe to call before or
   * after mount, and as often as you like. */
  setActive: (active: boolean) => void;
};

/** A scroll threshold in px of `window.scrollY` — or a function returning
 * one, evaluated on every scroll event (cheap), so it can depend on the
 * viewport (e.g. `() => window.innerHeight * 0.5`). */
export type ScrollBound = number | (() => number);

/** Builds a script that simply loops through a fixed list, in order. */
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

/** How long a line stays up if the script doesn't say: a base beat plus time
 * to read it, clamped — short quips flick by, longer ones linger. */
const DIALOGUE_SPEED_MULTIPLIER = 2;

export function readingHoldSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const hold = gsap.utils.clamp(3, 8, 2.2 + words * 0.4 + text.length * 0.025);
  return hold * DIALOGUE_SPEED_MULTIPLIER;
}

/** When a script returns null ("nothing to say right now"), how long until
 * it's asked again. Kept short so a script waiting on a state change (e.g.
 * lib/hero-dialogue.ts going quiet while the visitor is idle, then greeting
 * them the moment they're back) reacts promptly. Each re-ask is one O(1)
 * function call on the GSAP ticker — negligible. */
const QUIET_RECHECK_SECONDS = 0.4;

// ---- motion knobs (tune freely) ----

const TEXT_OUT_DURATION = 0.16;
/** New text starts fading in this long after the box starts resizing — late
 * enough that the elastic overshoot has mostly settled, early enough not to
 * feel laggy. Raise toward RESIZE_DURATION to wait for a fully still box. */
const TEXT_IN_DELAY = 0.1;
const TEXT_IN_DURATION = 0.3;
/** Body resize — the elastic "stretch to fit". Lower the elastic period for
 * more wobble, raise it for less. */
const RESIZE_DURATION = 0.95;
const RESIZE_EASE = "elastic.out(1, 0.35)";
/** Volume-preserving squash: when the body changes width it momentarily
 * changes height the other way, then springs back. Scaled by how big the
 * width change is (and, for wrapped lines, the height change); 0 disables. */
const SQUASH_STRENGTH = 0.32;
const SQUASH_IN_DURATION = 0.12;
const SQUASH_RECOVER_DURATION = 0.85;
const SQUASH_RECOVER_EASE = "elastic.out(1, 0.3)";
/** Bubble pop-in (show) and tuck-away (hide). */
const SHOW_DURATION = 0.9;
const SHOW_EASE = "elastic.out(1, 0.45)";
const SHOW_FROM_SCALE = 0.25;
const SHOW_FROM_ROTATION = 10; // degrees, mirrored for the left-side bubble
const HIDE_DURATION = 0.22;

// ---- shared visitor-activity tracker (one set of listeners for all bubbles)

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

type Props = {
  /** What the bubble says. Either a script (see lib/hero-dialogue.ts) or a
   * plain list, which is looped in order. Pass a STABLE value (module-level
   * or memoised) — a new identity re-initialises the bubble. */
  script?: SpeechBubbleScript;
  messages?: readonly (SpeechBubbleLine | string)[];
  /** Which side of its anchor point the bubble sits on. The tail is on the
   * opposite edge, pointing back at the anchor. */
  side?: "left" | "right";
  /** Only visible while `from <= window.scrollY < to`. Omit for "always". */
  visibleWhile?: { from?: ScrollBound; to?: ScrollBound };
  className?: string;
  ref?: Ref<SpeechBubbleHandle>;
};

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

  // `activeRef` remembers the last requested state so a `setActive(true)`
  // that lands before the GSAP setup below has run is never lost.
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

      // Sizes for a line, read off the hidden measure copy:
      // - `textW`/`h`: the measure box itself — the width the browser wrapped
      //   the text at. The visible text box is set to exactly this, so it
      //   wraps identically.
      // - `w`: the bubble BODY width — the widest RENDERED line plus
      //   horizontal padding. For one line that equals `textW`; for wrapped
      //   text it's narrower, because a wrapping box always takes its full
      //   max-width even when (balanced) lines don't fill it. Hugging the
      //   widest line instead is what stops multi-line bubbles getting big
      //   empty side margins. Line widths come from a Range's per-line
      //   client rects — one layout read, no extra DOM.
      // All rounded UP so nothing can be a sub-pixel too narrow and rewrap.
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

      // Text frame + line get the line's FINAL geometry. The frame is pinned
      // (CSS) to the bubble's tail-side edge and vertical center — the two
      // points that never move while the body springs — so the text never
      // follows the body's elastic over/undershoot. `marginTop: -h/2`
      // centers it vertically without touching `transform`, which GSAP uses
      // for the text's own in/out beats.
      const applyTextSize = (size: { w: number; h: number; textW: number }) => {
        gsap.set(textEl, { width: size.w, height: size.h, marginTop: -size.h / 2 });
        gsap.set(lineEl, { width: size.textW, height: size.h });
      };

      // Body hugs the widest line; the line box keeps the wrap width and is
      // centered in the frame by flexbox (overhanging only by empty slack).
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
        // Grow out of the tail side.
        transformOrigin: side === "left" ? "100% 50%" : "0% 50%",
      });

      const schedule = (seconds: number) => {
        holdCall?.kill();
        holdCall = null;
        if (!shown || swapping) return;
        holdCall = gsap.delayedCall(seconds, advance);
      };

      // Animated change to a new line (bubble is visible).
      const say = (text: string, hold: number) => {
        const fromW = (gsap.getProperty(body, "width") as number) || 1;
        const fromH = (gsap.getProperty(body, "height") as number) || 1;

        swapping = true;
        current = text;
        currentHold = hold;
        lineInAppearance++;
        totalLines++;
        // Lay the line out in the hidden copy and read its size — the
        // ResizeObserver also sees this, but ignores it while `swapping`.
        measureEl.textContent = text;
        const to = measure();

        const tl = gsap.timeline({
          onComplete: () => {
            swapping = false;
            swapTl = null;
            snapToCurrentSize(); // catches a resize mid-swap; else no-op
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

        // Relative change per axis: +0.5 = 50% bigger, -0.3 = 30% smaller.
        const widthChange = gsap.utils.clamp(-1, 1, to.w / fromW - 1);
        const heightChange = gsap.utils.clamp(-1, 1, to.h / fromH - 1);

        // Per axis: if THIS axis is changing, it springs elastically straight
        // to its target (the overshoot is the "stretch"). If it ISN'T (e.g.
        // a one-line → one-line swap leaves height alone), it gets squashed
        // the opposite way to the other axis's change — volume-preserving
        // squash & stretch — then springs back. A one-line → two-line swap
        // (wrapping) changes both, so both just spring.
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
            // Text jumps straight to its final size AND position while
            // invisible; from here on nothing about it depends on the body,
            // so the body's wobble can't move or reflow it.
            applyTextSize(to);
          })
          .addLabel("resize");
        tweenAxis("width", to.w, widthChange, heightChange);
        tweenAxis("height", to.h, heightChange, widthChange);
        // New text fades in only once the box has done the bulk of its
        // springing (see TEXT_IN_DELAY), with a calm, non-bouncy ease so the
        // text itself reads as steady against the wobbling box.
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

      // ---- show / hide ----
      const sync = () => {
        const shouldShow = active && inRange;
        if (shouldShow === shown) return;
        shown = shouldShow;

        if (shouldShow) {
          appearance++;
          lineInAppearance = 0;
          // A swap left half-finished by the last hide: drop it (its text
          // may be faded out / its body mid-wobble) and settle instantly.
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
            // Script had nothing at all to open with — stay hidden until it
            // does; try again on the next show.
            shown = false;
            appearance--;
            return;
          }

          if (reduceMotion) {
            gsap.to(pop, { autoAlpha: 1, duration: 0.25, overwrite: "auto" });
          } else {
            // Restart the pop from small only if it had fully tucked away;
            // if it's still mid-hide, spring back from wherever it is.
            if ((gsap.getProperty(pop, "opacity") as number) === 0) {
              gsap.set(pop, { scale: SHOW_FROM_SCALE, rotation: SHOW_FROM_ROTATION * rotSign });
            }
            // Opacity on its own short linear tween — elastic eases
            // overshoot, which would make opacity flicker.
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
        // Function bounds may depend on the viewport size.
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
      {/* Invisible, in-flow copy of the current/next line: gives the root its
          size (so `max-width` makes long lines wrap) and is what the visible
          body measures itself against. */}
      <span ref={measureRef} className="speech-bubble__measure" aria-hidden="true" />
      <div className="speech-bubble__anchor">
        <div ref={popRef} className="speech-bubble__pop">
          <div ref={bodyRef} className="speech-bubble__body">
            {/* Outer: centering + the text's own in/out animation (GSAP).
                Inner: the actual text, sized to the measured wrap width. */}
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
