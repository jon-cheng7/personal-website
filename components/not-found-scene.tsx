"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import "./not-found-scene.css";
import { TransitionLink } from "./transition-link";

// A handful of lines instead of "404 — Page Not Found" — Jon's ask was for
// someone who lands here to be pleasantly surprised, not just informed.
// One is picked at random per visit rather than always showing the first,
// so reloading (or landing on a different broken link another time) has a
// small chance of a different line.
const LOST_LINES = [
  "Well this is awkward...",
  "Congrats, you found the secret nothing!",
  "A dead end with execellent typography.",
  "I swear I fixed this.",
];

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const DIGITS = ["4", "0", "4"];

// Tuning for the digits' mouse-dodge effect below (see the pointermove
// handler): how close the pointer has to get to a digit's own center
// before it starts pushing that digit away, and how far a digit can be
// shoved at the closest possible distance (the pointer sitting right on
// top of it). Kept as named constants since they're the two numbers most
// likely to want tweaking by feel later.
const REPEL_RADIUS = 160;
const MAX_OFFSET = 36;

export function NotFoundScene() {
  const digitRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // Picked once via useState's lazy initializer, not on every render.
  const [line, setLine] = useState(LOST_LINES[0]);
  useEffect(() => {
    setLine(LOST_LINES[Math.floor(Math.random() * LOST_LINES.length)]);
  }, []);
  
  const [secondsLost, setSecondsLost] = useState(0);

  // The "404" digits playfully dodge the cursor rather than sitting still —
  // fitting, for a page about something that can't be found: reach for it
  // and it scoots away. Replaces the earlier perpetual liquid-wipe ripple
  // (per Jon's feedback that it read as a little odd and only affected part
  // of the numerals) with a direct, literal mouse interaction on the "404"
  // text itself instead.
  useEffect(() => {
    // Gated the same way components/custom-cursor.tsx gates its own
    // pointer-follow tracking: a fine-pointer check (no meaningful "hover
    // proximity" on touch) and a reduced-motion check (this is pure
    // decorative motion, easy to skip outright rather than tone down).
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const digits = digitRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null,
    );
    if (digits.length === 0) return;

    // One quickTo pair per digit — the same "re-target an in-flight tween
    // instead of starting a new one every call" pattern the custom cursor
    // uses for its own pointer-follow easing (components/custom-cursor.tsx)
    // — so each digit eases smoothly toward wherever it's currently being
    // pushed, or back to its resting (0, 0) offset once the pointer moves
    // away, rather than jumping between positions.
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
        // Read fresh every move rather than cached once — cheap for three
        // elements, and correct even if a resize or reflow shifted them
        // since the last read.
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

        // Falls off linearly from full strength (pointer right on the
        // digit's center) to zero (pointer at the edge of the radius) —
        // simple, and reads as a natural "personal space" bubble around
        // each digit rather than a hard on/off snap.
        const strength = (1 - distance / REPEL_RADIUS) * MAX_OFFSET;
        movers[i].x((dx / distance) * strength);
        movers[i].y((dy / distance) * strength);
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    // Pointer leaving the window entirely should still let the digits
    // settle back home, same as the custom cursor hiding itself on the
    // same event.
    document.documentElement.addEventListener("mouseleave", rest);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", rest);
    };
  }, []);

  useEffect(() => {
    // Not a real "time since you got lost" tracker — just a small, low-key
    // delight that pays off for anyone who lingers on the joke for more
    // than a glance, rather than a one-shot gag.
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
