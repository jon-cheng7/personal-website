"use client";

// Renders light + dark copies of nav chrome; chrome-tone clips each to its tone regions.
// Fits: used by Nav for MENU/CLOSE, icon, logo.

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { registerToneTarget, type ChromeTone } from "@/lib/chrome-tone";
import "./chrome-tone-mask.css";

/** palette: color per copy; children rendered identically in each. */
interface ChromeToneMaskProps {
  className?: string;
  children: ReactNode;
  palette: Record<ChromeTone, string>;
}

/** Registers copies with lib/chrome-tone. */
export function ChromeToneMask({ className, children, palette }: ChromeToneMaskProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const lightOnDarkRef = useRef<HTMLSpanElement>(null);
  const darkOnLightRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const lightOnDark = lightOnDarkRef.current;
    const darkOnLight = darkOnLightRef.current;
    if (!wrapper || !lightOnDark || !darkOnLight) return;
    return registerToneTarget(wrapper, {
      "light-on-dark": lightOnDark,
      "dark-on-light": darkOnLight,
    });
  }, []);

  return (
    <span ref={wrapperRef} className={`chrome-tone-mask ${className ?? ""}`}>
      <span className="chrome-tone-mask__sizer" aria-hidden="true">
        {children}
      </span>
      <span
        ref={lightOnDarkRef}
        className="chrome-tone-mask__copy"
        style={{ color: palette["light-on-dark"] }}
      >
        {children}
      </span>
      <span
        ref={darkOnLightRef}
        className="chrome-tone-mask__copy"
        style={{ color: palette["dark-on-light"] }}
        aria-hidden="true"
      >
        {children}
      </span>
    </span>
  );
}
