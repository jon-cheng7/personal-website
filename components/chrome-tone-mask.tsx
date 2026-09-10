"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { registerToneTarget, type ChromeTone } from "@/lib/chrome-tone";
import "./chrome-tone-mask.css";

interface ChromeToneMaskProps {
  className?: string;
  /** Rendered identically in every copy — only each copy's own color
   * differs (via `palette`), since a clip-path can only choose which
   * pixels of a given copy are visible, not recolor them. */
  children: ReactNode;
  palette: Record<ChromeTone, string>;
}

/**
 * Two perfectly-stacked, differently-colored copies of `children`, each
 * revealed only where lib/chrome-tone.ts's geometry system says that tone
 * actually applies underneath this element right now — including
 * splitting mid-glyph or mid-icon if a region boundary happens to fall
 * there, since the reveal is a real clip-path shape driven by layout
 * geometry, not a whole-element color decision. Used for the nav's
 * MENU/CLOSE label and hamburger/X icon (see nav.tsx); the logo and the
 * cursor use the same lib/chrome-tone.ts engine directly instead, since
 * their markup (a raster image, a scaling/masking circle) doesn't fit
 * this "plain colored copy" shape as cleanly.
 */
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
      {/* Invisible — exists purely so the wrapper takes on this content's
          natural size via normal layout flow, which the two absolutely-
          positioned copies below then exactly overlap. Hidden from
          assistive tech; one of the two real copies below is the single
          accessible reading of this content. */}
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
