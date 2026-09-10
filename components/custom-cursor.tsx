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
 * Visibility against arbitrary backdrops is `mix-blend-mode: difference`
 * (see custom-cursor.css) — deliberately *not* the geometry-based
 * chrome-tone system the nav icon/label/logo use (lib/chrome-tone.ts):
 * that system is reserved for the small, fixed, *known* set of
 * backgrounds the nav chrome sits over, where an unpredictable blended
 * color was worth engineering around; the cursor travels continuously
 * over genuinely arbitrary content no fixed region tagging could ever
 * follow, and an occasionally slightly-off color on a small 14px
 * decorative dot is a minor, momentary cosmetic issue rather than a
 * legibility-critical one — the original tradeoff this component was
 * built with, restored here after a brief detour through the tone system
 * that over-applied it to something that didn't need it.
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

    // Visibility lifecycle: the dot has no business being visible before
    // the browser has ever told us where the real pointer is (its
    // position would otherwise default to wherever `transform` happens to
    // start, e.g. the top-left corner) — so `pointermove` itself, not just
    // `mouseenter`, is what's responsible for first showing it. Previously
    // this relied solely on `mouseenter` on <html>, which reliably fires
    // when the pointer enters the window but doesn't guarantee the dot has
    // actually been positioned yet, and doesn't cover every path a
    // pointer can appear on. `hasShown` just avoids writing
    // `style.opacity` on every single pointermove once it's already
    // visible.
    let hasShown = false;
    // Separately, `hasPositioned` tracks whether the dot has ever actually
    // been placed at a real pointer position yet. `quickTo`'s tween always
    // eases *from* GSAP's last-known x/y for this element, which defaults
    // to (0, 0) — the fixed anchor's own resting position, i.e. the
    // top-left corner — until something sets it otherwise. Without this,
    // the very first pointermove after mount (e.g. right after a reload)
    // would visibly tween the dot flying in from the corner to wherever
    // the pointer actually is, instead of appearing right there. Only the
    // very first move (or the first one after re-entering the window,
    // since position during the hidden gap is unknown) skips the tween.
    let hasPositioned = false;

    const show = () => {
      dot.style.opacity = "1";
      hasShown = true;
    };
    const hide = () => {
      dot.style.opacity = "0";
      // Reset so the next pointermove (not just the next `mouseenter`,
      // which doesn't always fire on its own) reliably shows it again —
      // and so that reappearance snaps straight to the real position
      // rather than tweening in from wherever it happened to be hidden.
      hasShown = false;
      hasPositioned = false;
    };

    const move = (event: PointerEvent) => {
      if (!hasShown) show();
      if (prefersReducedMotion || !hasPositioned) {
        // No lag for reduced-motion visitors, and no lag for the very
        // first placement regardless of motion preference — jump straight
        // to the pointer rather than tweening from a stale/default
        // position. `gsap.set` (not a raw style write) keeps GSAP's own
        // internal transform cache in sync, so the *next* call to
        // moveX/moveY eases from this real position instead of (0, 0).
        gsap.set(dot, { x: event.clientX, y: event.clientY });
        hasPositioned = true;
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

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", onPointerOver);
    window.addEventListener("pointerout", onPointerOut);
    // Hides the dot rather than leaving it stranded at the last known
    // position when the pointer leaves the window (e.g. to the browser
    // chrome or another app) — reappears on the next real pointer move
    // after re-entry (see `hasShown` above), with `mouseenter` kept as a
    // belt-and-suspenders in case a browser fires it without an
    // accompanying pointermove.
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
