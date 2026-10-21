"use client";

// Full-screen lime wipe between routes (cover → navigate → reveal).
// Fits: mounted once in layout; triggered via lib/screen-transition-store (TransitionLink).

import { useEffect, useRef, useTransition } from "react";
import { gsap } from "@/lib/gsap";
import {
  registerScreenTransition,
  type ScreenTransitionOrigin,
} from "@/lib/screen-transition-store";
import "./screen-transition.css";

/** Wipe color + cover/reveal durations (s). */
const WIPE_COLOR = "var(--color-accent, #c5fb45)";
const COVER_DURATION = 0.9;
const REVEAL_DURATION = 0.9;

/** Registers cover/reveal controller. */
export function ScreenTransition() {
  const maskBackgroundRef = useRef<SVGRectElement>(null);
  const maskCircleRef = useRef<SVGCircleElement>(null);
  const originRef = useRef<ScreenTransitionOrigin>({ x: 0, y: 0 });
  const maxRadiusRef = useRef(0);

  const [isPending, startNavigation] = useTransition();
  const pendingRevealRef = useRef(false);
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
      if (bg) bg.setAttribute("fill", "black");
      if (circle) {
        circle.setAttribute("fill", "white");
        circle.setAttribute("cx", String(origin.x));
        circle.setAttribute("cy", String(origin.y));
      }
      return animateRadius(COVER_DURATION);
    }

    function reveal(): Promise<void> {
      const bg = maskBackgroundRef.current;
      const circle = maskCircleRef.current;
      if (bg) bg.setAttribute("fill", "white");
      if (circle) circle.setAttribute("fill", "black");
      return animateRadius(REVEAL_DURATION);
    }
    revealRef.current = reveal;

    function navigate(origin: ScreenTransitionOrigin, pushRoute: () => void): void {
      cover(origin).then(() => {
        pendingRevealRef.current = true;
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
