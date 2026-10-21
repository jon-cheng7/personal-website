"use client";

import { useCallback, useRef, type CSSProperties, type HTMLAttributes } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { resolveScrollPoint, type ScrollPoint } from "@/lib/scroll-bound";
import {
  ScrollMotion,
  type MotionLock,
  type MotionLook,
  type MotionParallax,
  type MotionPhase,
  type MotionRange,
  type ScreenLength,
  type Smoothing,
} from "@/components/scroll-motion";
import "./reveal-text.css";

// ---------------------------------------------------------------------------
// RevealText — big statement text whose words light up (dim → lit) as you
// scroll. All the MOVEMENT (enter / lock / exit / parallax) is a
// <ScrollMotion> wrapper (components/scroll-motion.tsx) — the same one any
// other element can use; this component only adds the word lighting, timed
// off the exact scroll value ScrollMotion moves it by.
//
// Phones: words light as the block scrolls through the viewport. Reduced
// motion: fully lit, static (pure CSS).
// ---------------------------------------------------------------------------

// Kept under their old names so existing imports keep working.
export type RevealRange = MotionRange;
export type RevealLook = MotionLook;
export type RevealPhase = MotionPhase;
export type RevealLock = MotionLock;
export type RevealParallax = MotionParallax;
export type { ScreenLength };

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children" | "onScroll"> & {
  text: string;
  /** Element for the text (default "p"). */
  as?: "p" | "h1" | "h2" | "h3" | "div";
  enter?: RevealPhase;
  lock?: RevealLock;
  /** Light the words up over this range (default: the lock range). */
  reveal?: RevealRange;
  exit?: RevealPhase;
  parallax?: RevealParallax;
  /** Seconds the motion trails the scroll (see ScrollMotion). */
  smoothing?: Smoothing;
  /** Unlit word color. Default: barely-visible dark grey. */
  dimColor?: string;
  /** Lit word color. */
  litColor?: string;
  /** How many words are mid-transition at once. */
  softness?: number;
};

const MOBILE = "(max-width: 900px) and (prefers-reduced-motion: no-preference)";
const clamp01 = gsap.utils.clamp(0, 1);

export function RevealText({
  text,
  as: Tag = "p",
  enter,
  lock,
  reveal,
  exit,
  parallax,
  smoothing,
  dimColor,
  litColor,
  softness = 1.5,
  className,
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const words = text.split(/\s+/).filter(Boolean);
  // Set up by the effect below; called by ScrollMotion every frame the
  // track moves (desktop).
  const revealAtRef = useRef<((s: number) => void) | null>(null);
  const onScroll = useCallback((s: number) => revealAtRef.current?.(s), []);

  const configKey = JSON.stringify([text, reveal, lock, dimColor, litColor, softness], (_, v) =>
    typeof v === "function" ? String(v) : v,
  );

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const wordEls = Array.from(root.querySelectorAll<HTMLElement>(".reveal-text__word"));
      const cs = getComputedStyle(root);
      const dim = cs.getPropertyValue("--reveal-dim").trim() || "#262626";
      const lit = cs.getPropertyValue("--reveal-lit").trim() || "#f5f5f5";
      const mixColor = gsap.utils.interpolate(dim, lit);

      // Only words whose (quantized) progress changed get a style write.
      const lastWord = new Array<number>(wordEls.length).fill(-1);
      const applyReveal = (p: number) => {
        const n = wordEls.length;
        for (let i = 0; i < n; i++) {
          const wp = Math.round(clamp01((p * (n - 1 + softness) - i) / softness) * 50) / 50;
          if (wp === lastWord[i]) continue;
          lastWord[i] = wp;
          wordEls[i].style.color = wp === 0 ? "" : wp === 1 ? lit : (mixColor(wp) as string);
        }
      };

      // Desktop: reveal range resolved on every refresh (resize).
      const bounds = { rS: 0, rE: 0 };
      const resolve = () => {
        const start = reveal?.start ?? lock?.start;
        const end = reveal?.end ?? lock?.end;
        bounds.rS = start !== undefined ? resolveScrollPoint(start as ScrollPoint) : 0;
        bounds.rE = end !== undefined ? resolveScrollPoint(end as ScrollPoint) : bounds.rS;
      };
      resolve();
      ScrollTrigger.addEventListener("refresh", resolve);
      revealAtRef.current = (s) => {
        const { rS, rE } = bounds;
        applyReveal(rE > rS ? clamp01((s - rS) / (rE - rS)) : s >= rE ? 1 : 0);
      };

      // Phones: light up while the block scrolls through the viewport.
      const mm = gsap.matchMedia();
      mm.add(MOBILE, () => {
        const st = ScrollTrigger.create({
          trigger: root,
          start: "top 80%",
          end: "bottom 35%",
          scrub: 0.5,
          onUpdate: (self) => applyReveal(self.progress),
        });
        applyReveal(st.progress);
        return () => st.kill();
      });

      return () => {
        mm.revert();
        ScrollTrigger.removeEventListener("refresh", resolve);
        revealAtRef.current = null;
        for (const w of wordEls) w.style.color = "";
      };
    },
    { scope: ref, dependencies: [configKey], revertOnUpdate: true },
  );

  const vars = {
    "--reveal-dim": dimColor,
    "--reveal-lit": litColor,
    ...style,
  } as CSSProperties;

  return (
    <ScrollMotion
      className="reveal-text-motion"
      enter={enter}
      lock={lock}
      exit={exit}
      parallax={parallax}
      smoothing={smoothing}
      onScroll={onScroll}
    >
      <div
        ref={ref}
        className={className ? `reveal-text ${className}` : "reveal-text"}
        style={vars}
        {...rest}
      >
        <Tag className="reveal-text__body">
          {words.map((w, i) => (
            <span key={i} className="reveal-text__word">
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </Tag>
      </div>
    </ScrollMotion>
  );
}
