"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import "./custom-cursor.css";

/**
 * A small lime dot that replaces the native cursor and tracks the pointer,
 * expanding into a hollow ring over anything interactive. Mounted once at
 * the app root (see app/layout.tsx), alongside Nav and SmoothScroll —
 * global chrome, not page-specific.
 *
 * Built as the foundation for a planned follow-up (per the project doc):
 * swapping which icon/shape renders depending on which kind of
 * interactive region the pointer is over. That's why hover-detection here
 * is already event-delegated against a `closest()` check rather than
 * hard-coded to "a and button" — extending it later to read a data
 * attribute (e.g. `data-cursor="play"`) and swap the rendered shape is a
 * change to `onPointerOver`/`onPointerOut` below, not a rearchitecture.
 *
 * Movement has a light lag/spring to it ("physics") rather than snapping
 * 1:1 to the real pointer — via GSAP's `quickTo`, one lightweight tween
 * per axis that's purpose-built for exactly this (cursor-follow, drag,
 * scrub) rather than a hand-rolled rAF/lerp loop. `quickTo` still drives a
 * plain `transform`, so this stays on the GPU-compositor path the same as
 * the old 1:1 version did (see the horizontal-scroll pin/scrub and the
 * liquid-wipe clip-path elsewhere in this codebase for the same
 * transform-only principle) — the lag is real easing, not a performance
 * compromise. `prefers-reduced-motion` skips the lag entirely and snaps
 * straight to the pointer instead, consistent with how this component
 * already treats reduced motion for its hover/color transitions below.
 *
 * Performance shape, otherwise unchanged:
 * - Hover-region detection is one delegated `pointerover`/`pointerout`
 *   listener pair checking `closest()`, not per-frame hit-testing against
 *   the cursor's own position and not a listener attached to every
 *   interactive element individually.
 * - Gated behind `(pointer: fine)` at mount, so touch/coarse-pointer
 *   devices never attach any of these listeners or pay for this component
 *   at all, and the native cursor is left completely alone for them.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const dot = dotRef.current;
    const inner = innerRef.current;
    if (!dot || !inner) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // The hover/reduced-motion states above still transition (scale,
    // color) even with this class — it's the position tracking that has
    // no transition to remove, since it was never animated by CSS in the
    // first place. This only turns off the *easing* on those state
    // changes, leaving the dot itself fully functional as a low-motion
    // pointer indicator rather than disabling the feature outright.
    if (prefersReducedMotion) {
      dot.classList.add("is-reduced-motion");
    }

    document.documentElement.classList.add("has-custom-cursor");

    // quickTo returns a function-per-axis that re-targets an in-flight
    // tween instead of starting a new one on every call — the standard
    // GSAP pattern for anything driven by a high-frequency event like
    // pointermove. duration/ease are tuned for a quick, slightly-trailing
    // "catch up" feel rather than a heavy drag; nudge `duration` up for
    // more lag, or the ease toward "power1"/"none" for something snappier.
    const moveX = gsap.quickTo(dot, "x", { duration: 0.35, ease: "power3" });
    const moveY = gsap.quickTo(dot, "y", { duration: 0.35, ease: "power3" });

    const move = (event: PointerEvent) => {
      if (prefersReducedMotion) {
        // No lag for reduced-motion visitors — jump straight to the
        // pointer rather than trailing behind it.
        dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      } else {
        moveX(event.clientX);
        moveY(event.clientY);
      }
    };

    const onPointerOver = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest("a, button, [data-cursor-hover]")) {
        inner.classList.add("is-hovering");
      }
    };

    const onPointerOut = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest("a, button, [data-cursor-hover]")) {
        inner.classList.remove("is-hovering");
      }
    };

    const show = () => {
      dot.style.opacity = "1";
    };
    const hide = () => {
      dot.style.opacity = "0";
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", onPointerOver);
    window.addEventListener("pointerout", onPointerOut);
    // Hides the dot rather than leaving it stranded at the last known
    // position when the pointer leaves the window (e.g. to the browser
    // chrome or another app) — reappears on re-entry.
    document.documentElement.addEventListener("mouseleave", hide);
    document.documentElement.addEventListener("mouseenter", show);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("pointerout", onPointerOut);
      document.documentElement.removeEventListener("mouseleave", hide);
      document.documentElement.removeEventListener("mouseenter", show);
    };
  }, []);

  return (
    <div ref={dotRef} className="custom-cursor" aria-hidden="true">
      <div ref={innerRef} className="custom-cursor__inner" />
    </div>
  );
}
