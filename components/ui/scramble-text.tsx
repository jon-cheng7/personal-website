"use client";

// ScrambleText — text that decodes through random glyphs into its value (left → right),
// and with `hide` scrambles back out (right → left) into blanks: the exact reverse.
// Fits: HUD readouts (photo archive META, index columns). Decode replays when `text` or `play` changes.
// Writes textContent directly (no re-render per frame). Off-screen / reduced motion → final state instantly.
// Blank = non-breaking spaces, so the box keeps its width while hidden.

import { useEffect, useRef } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#%01ABCDEF";
const BLANK = " ";

type Props = {
  text: string;
  /** change to replay the decode (e.g. new photo). null = no decode animation */
  play?: unknown;
  /** true → scramble out to blanks (animated if it was showing); false → show / decode in */
  hide?: boolean;
  /** total decode time, ms (scramble-out uses ~70% of it) */
  duration?: number;
  delay?: number;
  /** animate on first mount too */
  animateOnMount?: boolean;
  className?: string;
};

function inView(el: Element) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}

const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const blank = (s: string) => [...s].map((c) => (c === " " ? " " : BLANK)).join("");

/** rAF loop: frame(t) returns the string for elapsed t; stops after `end` ms. Returns cancel. */
function run(el: HTMLElement, end: number, frame: (t: number) => string) {
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = now - start;
    el.textContent = frame(t);
    if (t < end) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export function ScrambleText({ text, play, hide = false, duration = 520, delay = 0, animateOnMount = false, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  /** was the text showing before this change? (decides whether hiding animates) */
  const shown = useRef(!hide);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = !mounted.current;
    mounted.current = true;
    const wasShown = shown.current;
    shown.current = !hide;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !inView(el);
    const chars = [...text];
    const n = Math.max(1, chars.length);

    // --- out: right → left, each char flickers then blanks ---
    if (hide) {
      if (first || !wasShown || still) {
        el.textContent = blank(text);
        return;
      }
      const span = duration * 0.7;
      const start = chars.map((_, i) => ((n - 1 - i) / n) * span * 0.6 + Math.random() * span * 0.15);
      const gone = start.map((s) => s + span * 0.25);
      const cancel = run(el, Math.max(...gone), (t) =>
        chars.map((c, i) => (c === " " ? " " : t < start[i] ? c : t < gone[i] ? glyph() : BLANK)).join(""),
      );
      return () => {
        cancel();
        el.textContent = blank(text);
      };
    }

    // --- in: left → right decode ---
    if ((first && !animateOnMount) || play === null || still) {
      el.textContent = text;
      return;
    }
    const settle = chars.map((_, i) => delay + (i / n) * duration * 0.7 + Math.random() * duration * 0.3);
    const cancel = run(el, Math.max(...settle, delay), (t) =>
      chars.map((c, i) => (c === " " || t >= settle[i] ? c : t < delay ? BLANK : glyph())).join(""),
    );
    return () => {
      cancel();
      el.textContent = text;
    };
  }, [text, play, hide, duration, delay, animateOnMount]);

  return (
    <span className={className} aria-label={text}>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </span>
  );
}
