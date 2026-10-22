"use client";

// Two-sided card (front/back FrostPanels) that flips on scroll. Look only.
// Fits: reusable; wrap in <Actor> → its `flip` channel drives it (0 = front, 1 = back). No channel = front.

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useChannel } from "@/components/choreo";
import { FrostPanel, type FrostLook } from "./frost-panel";
import "./flip-card.css";

type Props = FrostLook & {
  front: ReactNode;
  back: ReactNode;
  /** Actor channel driving the flip. Default "flip". */
  channel?: string;
  /** "y" = flip left↔right (default), "x" = top↔bottom. */
  axis?: "x" | "y";
  className?: string;
  style?: CSSProperties;
};

export function FlipCard({ front, back, channel = "flip", axis = "y", className, style, ...look }: Props) {
  const inner = useRef<HTMLDivElement>(null);
  const shown = useRef<"front" | "back">("front");

  useChannel(channel, (v) => {
    const el = inner.current;
    if (!el) return;
    el.style.transform = v <= 0 ? "" : `rotate${axis.toUpperCase()}(${(v * 180).toFixed(2)}deg)`;
    const side = v < 0.5 ? "front" : "back";
    if (side === shown.current) return;
    shown.current = side;
    el.dataset.side = side;
  });

  return (
    <div className={className ? `flip-card ${className}` : "flip-card"} style={style}>
      <div ref={inner} className="flip-card__inner" data-axis={axis} data-side="front">
        <FrostPanel className="flip-card__face flip-card__face--front" {...look}>
          {front}
        </FrostPanel>
        <FrostPanel className="flip-card__face flip-card__face--back" {...look}>
          {back}
        </FrostPanel>
      </div>
    </div>
  );
}
