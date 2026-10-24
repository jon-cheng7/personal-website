"use client";

// Odometer — digits roll to their value on mechanical strips (transform only).
// Fits: HUD numbers (coords, timestamps). Non-digits stay static. Re-rolls from zero when `play` changes.

import { useEffect, useState } from "react";
import "./odometer.css";

type Props = {
  value: string;
  /** change to roll again from 0. null = paused (no roll) */
  play?: unknown;
  /** ms between digit columns */
  stagger?: number;
  className?: string;
};

const STRIP = [..."0123456789"].map((n) => <span key={n}>{n}</span>);

export function Odometer({ value, play, stagger = 24, className }: Props) {
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
  return (
    <span className={`odo${className ? ` ${className}` : ""}`} aria-label={value} data-zeroed={zeroed || undefined}>
      {[...value].map((ch, i) => {
        if (ch < "0" || ch > "9") {
          return (
            <span key={i} className="odo__c" aria-hidden>
              {ch}
            </span>
          );
        }
        const d = zeroed ? 0 : +ch;
        const delay = col++ * stagger;
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
