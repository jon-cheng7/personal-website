"use client";

// ScrambleText — text that decodes through random glyphs into its value, left → right.
// Fits: HUD readouts (photo archive META). Re-runs when `text` or `play` changes.
// Writes textContent directly (no re-render per frame). Off-screen / reduced motion → final text instantly.

import { useEffect, useRef } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#%01ABCDEF";

type Props = {
  text: string;
  /** change to replay (e.g. META toggled on). null = paused: show final text, no animation */
  play?: unknown;
  /** total decode time, ms */
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

export function ScrambleText({ text, play, duration = 520, delay = 0, animateOnMount = false, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = !mounted.current;
    mounted.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ((first && !animateOnMount) || play === null || reduced || !inView(el)) {
      el.textContent = text;
      return;
    }

    // per-char settle time: sweep left → right + jitter
    const chars = [...text];
    const settle = chars.map((_, i) => delay + (i / Math.max(1, chars.length)) * duration * 0.7 + Math.random() * duration * 0.3);
    const end = Math.max(...settle, delay);
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = now - start;
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        out += c === " " || t >= settle[i] ? c : t < delay ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, play, duration, delay, animateOnMount]);

  return (
    <span className={className} aria-label={text}>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </span>
  );
}
