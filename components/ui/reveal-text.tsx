"use client";

// Statement text whose words light dim → lit.
// Fits: driven by enclosing Actor's `reveal` channel (0–1). Outside an Actor: shown lit.

import { useRef, type CSSProperties, type HTMLAttributes } from "react";
import { gsap } from "@/lib/gsap";
import { useChannel } from "@/components/choreo";
import "./reveal-text.css";

/** text; as = tag; dimColor/litColor; softness = words mid-fade at once; channel = Actor channel name. */
type Props = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  text: string;
  as?: "p" | "h1" | "h2" | "h3" | "div";
  dimColor?: string;
  litColor?: string;
  softness?: number;
  channel?: string;
};

const clamp01 = gsap.utils.clamp(0, 1);

/** One color write per word whose progress changed. */
export function RevealText({
  text,
  as: Tag = "p",
  dimColor,
  litColor,
  softness = 1.5,
  channel = "reveal",
  className,
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const words = text.split(/\s+/).filter(Boolean);
  const cache = useRef<{ last: number[]; mix: ((p: number) => string) | null; lit: string }>({
    last: [],
    mix: null,
    lit: "",
  });

  const driven = useChannel(channel, (p) => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = root.querySelectorAll<HTMLElement>(".reveal-text__word");
    const c = cache.current;
    if (!c.mix) {
      const cs = getComputedStyle(root);
      const dim = cs.getPropertyValue("--reveal-dim").trim() || "#262626";
      c.lit = cs.getPropertyValue("--reveal-lit").trim() || "#f5f5f5";
      c.mix = gsap.utils.interpolate(dim, c.lit) as (p: number) => string;
      c.last = new Array(els.length).fill(-1);
    }
    const n = els.length;
    for (let i = 0; i < n; i++) {
      const wp = Math.round(clamp01((p * (n - 1 + softness) - i) / softness) * 50) / 50;
      if (wp === c.last[i]) continue;
      c.last[i] = wp;
      els[i].style.color = wp === 0 ? "" : wp === 1 ? c.lit : c.mix(wp);
    }
  });

  const vars = {
    "--reveal-dim": dimColor,
    "--reveal-lit": litColor,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={className ? `reveal-text ${className}` : "reveal-text"}
      data-reveal-static={driven ? undefined : ""}
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
  );
}
