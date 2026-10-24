"use client";

// Odometer — digits roll to their value on mechanical strips (transform only).
// Fits: HUD numbers (coords, timestamps). Non-digits stay static. Re-rolls from zero when `play` changes;
// `out` rolls every digit back down to 0 (right → left) — the reverse, for hiding.

import { useEffect, useState } from "react";
import "./odometer.css";

type Props = {
  value: string;
  /** change to roll again from 0. null = paused (no roll) */
  play?: unknown;
  /** roll back to zeros (hide) */
  out?: boolean;
  /** ms between digit columns */
  stagger?: number;
  className?: string;
};

const STRIP = [..."0123456789"].map((n) => <span key={n}>{n}</span>);

export function Odometer({ value, play, out = false, stagger = 24, className }: Props) {
  // zeroed → value on the next frame = roll
  const [zeroed, setZeroed] = useState(false);

  useEffect(() => {
    if (play === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setZeroed(true);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setZeroed(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [play]);

  let col = 0;
  const cols = [...value].filter((c) => c >= "0" && c <= "9").length;
  return (
    <span
      className={`odo${className ? ` ${className}` : ""}`}
      aria-label={value}
      data-zeroed={zeroed || undefined}
      data-out={out || undefined}
    >
      {[...value].map((ch, i) => {
        if (ch < "0" || ch > "9") {
          return (
            <span key={i} className="odo__c" aria-hidden>
              {ch}
            </span>
          );
        }
        const d = zeroed || out ? 0 : +ch;
        const c = col++;
        const delay = (out ? cols - 1 - c : c) * stagger;
        return (
          <span key={i} className="odo__d" aria-hidden>
            <span className="odo__strip" style={{ transform: `translateY(${-d}em)`, transitionDelay: `${delay}ms` }}>
              {STRIP}
            </span>
          </span>
        );
      })}
    </span>
  );
}
