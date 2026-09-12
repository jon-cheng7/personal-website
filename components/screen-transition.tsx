"use client";

import { useEffect, useRef, useTransition } from "react";
import { gsap } from "@/lib/gsap";
import {
  registerScreenTransition,
  type ScreenTransitionOrigin,
} from "@/lib/screen-transition-store";
import "./screen-transition.css";

/** Same lime used by the circle it radiates from (components/hero.css) and
 * the nav drawer's own liquid wipe (components/nav.css) — one accent color,
 * three places, deliberately: this reads as "the circle you clicked is what
 * expanded to fill the screen," not an unrelated loading curtain. */
const WIPE_COLOR = "var(--color-accent, #c5fb45)";
const COVER_DURATION = 0.9;
const REVEAL_DURATION = 0.9;

/**
 * Persistent, mounted once in app/layout.tsx (same pattern as GlobalCursor —
 * a single instance that outlives route changes) rather than per-page, so a
 * transition already in flight is never interrupted by the very navigation
 * it's driving. Registers itself as the implementation behind lib/screen-
 * transition-store.ts on mount; components/transition-link.tsx is the
 * caller that actually drives it.
 *
 * The wipe is one `<mask>`-clipped rect whose visible shape flips meaning
 * between the two phases, rather than two different shapes:
 *
 * - Cover: the mask's circle is the ONLY visible (white) area against a
 *   hidden (black) background, so the lime rect only shows up inside that
 *   circle — growing it from r=0 at the click point to a radius that just
 *   reaches the farthest corner is what reads as lime radially expanding
 *   outward from the cursor to cover the whole screen.
 * - Reveal: the roles swap — the background becomes the visible (white)
 *   area and the circle becomes the hidden (black) one, so the lime now
 *   covers everything EXCEPT inside that circle. Growing the exact same
 *   radius from 0 again now reads as a hole opening at the same point and
 *   spreading outward, letting the page underneath (already loaded — see
 *   components/transition-link.tsx) bloom into view from where you clicked,
 *   rather than the lime simply shrinking back down to a dot.
 *
 * Both phases end at "the whole viewport is lime" / "the whole viewport is
 * clear," so the swap between them at the cover→reveal handoff is visually
 * seamless — nothing needs to jump or reset partway through a shape.
 */
export function ScreenTransition() {
  const maskBackgroundRef = useRef<SVGRectElement>(null);
  const maskCircleRef = useRef<SVGCircleElement>(null);
  const originRef = useRef<ScreenTransitionOrigin>({ x: 0, y: 0 });
  const maxRadiusRef = useRef(0);

  // Owns the "wait for the pushed route to actually finish mounting, then
  // reveal" half of `navigate()` below — see that method's own doc comment
  // on lib/screen-transition-store.ts's ScreenTransitionController for the
  // full reasoning. Short version: this state has to live on THIS
  // component specifically, because it's the one thing guaranteed to still
  // be mounted once the navigation it's driving actually completes — the
  // link that triggered it (components/transition-link.tsx) isn't.
  const [isPending, startNavigation] = useTransition();
  const pendingRevealRef = useRef(false);
  // Sidesteps effect-closure staleness: `reveal` itself is defined fresh
  // inside the OTHER effect below (it needs the same DOM refs `cover` and
  // `animateRadius` do), but this effect only needs whichever `reveal` is
  // CURRENT when isPending actually goes false, not a fixed one captured
  // at some earlier render — a ref is the standard way to bridge that
  // without folding both effects into one (which would otherwise have to
  // re-run, pointlessly, on every isPending flip).
  const revealRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    if (!isPending && pendingRevealRef.current) {
      pendingRevealRef.current = false;
      revealRef.current();
    }
  }, [isPending]);

  useEffect(() => {
    const prefersReducedMotion = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The farthest a viewport corner can be from `origin` — the radius the
    // growing circle needs to reach for it to have covered (or, in reveal,
    // fully cleared) every last corner of the screen, not just a centered
    // circle's own inscribed area.
    function distanceToFarthestCorner(origin: ScreenTransitionOrigin): number {
      const { innerWidth: w, innerHeight: h } = window;
      const corners: Array<[number, number]> = [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ];
      return Math.max(
        ...corners.map(([cx, cy]) => Math.hypot(cx - origin.x, cy - origin.y)),
      );
    }

    function animateRadius(duration: number): Promise<void> {
      const circle = maskCircleRef.current;
      if (!circle) return Promise.resolve();
      const state = { r: 0 };
      return new Promise((resolve) => {
        gsap.to(state, {
          r: maxRadiusRef.current,
          duration: prefersReducedMotion() ? 0.01 : duration,
          ease: "power2.inOut",
          onUpdate: () => circle.setAttribute("r", state.r.toFixed(1)),
          onComplete: resolve,
        });
      });
    }

    function cover(origin: ScreenTransitionOrigin): Promise<void> {
      originRef.current = origin;
      maxRadiusRef.current = distanceToFarthestCorner(origin);
      const bg = maskBackgroundRef.current;
      const circle = maskCircleRef.current;
      if (bg) bg.setAttribute("fill", "black"); // hidden by default…
      if (circle) {
        circle.setAttribute("fill", "white"); // …except inside the growing circle
        circle.setAttribute("cx", String(origin.x));
        circle.setAttribute("cy", String(origin.y));
      }
      return animateRadius(COVER_DURATION);
    }

    function reveal(): Promise<void> {
      // Same origin, same max radius as the `cover()` this is undoing —
      // roles swapped (see this component's own doc comment above).
      const bg = maskBackgroundRef.current;
      const circle = maskCircleRef.current;
      if (bg) bg.setAttribute("fill", "white"); // visible by default…
      if (circle) circle.setAttribute("fill", "black"); // …except the growing hole
      return animateRadius(REVEAL_DURATION);
    }
    revealRef.current = reveal;

    function navigate(origin: ScreenTransitionOrigin, pushRoute: () => void): void {
      cover(origin).then(() => {
        pendingRevealRef.current = true;
        // `startNavigation` (this component's OWN `useTransition`, not the
        // caller's) is what makes the isPending-watching effect above fire
        // reliably — see the doc comment on ScreenTransitionController's
        // `navigate` for why it has to be this component's own transition.
        startNavigation(pushRoute);
      });
    }

    registerScreenTransition({ cover, reveal, navigate });
    return () => registerScreenTransition(null);
  }, [startNavigation]);

  return (
    <svg className="screen-transition" aria-hidden="true">
      <mask id="screen-transition-mask">
        <rect ref={maskBackgroundRef} width="100%" height="100%" fill="black" />
        <circle ref={maskCircleRef} r="0" fill="white" />
      </mask>
      <rect width="100%" height="100%" fill={WIPE_COLOR} mask="url(#screen-transition-mask)" />
    </svg>
  );
}
