"use client";

// 404 scene: "404" digits dodge the pointer + lost-time counter.
// Fits: app/not-found.tsx.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import "./not-found-scene.css";
import { TransitionLink } from "./transition-link";

/** One picked at random per visit. */
const LOST_LINES = [
  "Well this is awkward...",
  "Congrats, you found the secret nothing!",
  "A dead end with execellent typography.",
  "I swear I fixed this.",
];

/** s → m:ss. */
function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const DIGITS = ["4", "0", "4"];

/** Dodge tuning: px radius, max px offset. */
const REPEL_RADIUS = 160;
const MAX_OFFSET = 36;

/** Dodge only for fine pointers, no reduced motion. */
export function NotFoundScene() {
  const digitRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [line, setLine] = useState(LOST_LINES[0]);
  useEffect(() => {
    setLine(LOST_LINES[Math.floor(Math.random() * LOST_LINES.length)]);
  }, []);
  
  const [secondsLost, setSecondsLost] = useState(0);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const digits = digitRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null,
    );
    if (digits.length === 0) return;

    const movers = digits.map((digit) => ({
      x: gsap.quickTo(digit, "x", { duration: 0.5, ease: "power3.out" }),
      y: gsap.quickTo(digit, "y", { duration: 0.5, ease: "power3.out" }),
    }));

    const rest = () => {
      movers.forEach(({ x, y }) => {
        x(0);
        y(0);
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      digits.forEach((digit, i) => {
        const rect = digit.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = centerX - event.clientX;
        const dy = centerY - event.clientY;
        const distance = Math.hypot(dx, dy);

        if (distance === 0 || distance >= REPEL_RADIUS) {
          movers[i].x(0);
          movers[i].y(0);
          return;
        }

        const strength = (1 - distance / REPEL_RADIUS) * MAX_OFFSET;
        movers[i].x((dx / distance) * strength);
        movers[i].y((dy / distance) * strength);
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("mouseleave", rest);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", rest);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLost((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="not-found" data-chrome-tone="light-on-dark">
      <div className="not-found__numerals" aria-hidden="true">
        {DIGITS.map((digit, i) => (
          <span
            key={i}
            ref={(el) => {
              digitRefs.current[i] = el;
            }}
            className="not-found__digit"
          >
            {digit}
          </span>
        ))}
      </div>
      <h1 className="not-found__heading">{line}</h1>
      <p className="not-found__body">
        shhh... this isn&rsquo;t built yet — or never
        existed to begin with. Either way, you are wasting your time here.
      </p>
      <p className="not-found__timer">
        Time spent lost here: {formatSeconds(secondsLost)}
      </p>
      <TransitionLink href="/" className="not-found__home">
        Take me home →
      </TransitionLink>
    </section>
  );
}
