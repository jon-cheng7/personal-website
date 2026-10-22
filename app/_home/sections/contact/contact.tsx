"use client";

// Contact finale: accent bitmap tide floods up (BitmapField), contact links fade in, "Jon ● cheng" returns.
// Fits: actors contactBg / contactInfo / contactName; where/when → home.choreo.ts (contact cues).
// Circle here = copy email (rim says so), not a link to /me. Click anywhere on the field = pixel ripple.

import { useEffect, useRef, useState } from "react";
import { Actor } from "@/components/choreo";
import { BitmapField } from "@/components/ui/bitmap-field";
import { contactInfo, socialLinks } from "@/content/social";
import { gsap } from "@/lib/gsap";
import { fitNameToWidth } from "../hero/fit-name";
import "./contact.css";

const RIM_IDLE = "  COPY  EMAIL  •  COPY  EMAIL  •  COPY  • ";
const RIM_DONE = "COPIED ✓ • COPIED ✓ • COPIED ✓ • ";
const RIM_SECONDS = 20;
const COPIED_MS = 2200;

export function Contact() {
  const email = contactInfo.email.toLowerCase();
  return (
    <>
      <Actor id="contactBg" className="contact-bg-actor">
        <BitmapField className="contact-bg" />
      </Actor>

      <Actor id="contactInfo" className="contact-info-actor">
        <section className="contact-info" aria-label="Contact">
          <p className="contact-info__eyebrow">say hello</p>
          <a className="contact-info__email" href={`mailto:${email}`}>
            {email}
          </a>
          <ul className="contact-info__social">
            {socialLinks.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </Actor>

      <Actor id="contactName" className="contact-name-actor">
        <ContactName email={email} />
      </Actor>
    </>
  );
}

function ContactName({ email }: { email: string }) {
  const row = useRef<HTMLDivElement>(null);
  const jon = useRef<HTMLSpanElement>(null);
  const circle = useRef<HTMLButtonElement>(null);
  const cheng = useRef<HTMLSpanElement>(null);
  const rim = useRef<SVGSVGElement>(null);
  const spin = useRef<gsap.core.Tween | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const r = row.current;
    const parts = [jon.current, circle.current, cheng.current];
    if (!r || parts.some((p) => !p)) return;
    const fit = () => fitNameToWidth(r, parts as HTMLElement[]);
    fit();
    window.addEventListener("resize", fit);
    document.fonts?.ready?.then(fit);
    if (rim.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spin.current = gsap.to(rim.current, { rotation: 360, duration: RIM_SECONDS, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
    }
    return () => {
      window.removeEventListener("resize", fit);
      spin.current?.kill();
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(t);
  }, [copied]);

  const speed = (to: number, d: number) => {
    if (spin.current) gsap.to(spin.current, { timeScale: to, duration: d });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  const rimText = copied ? RIM_DONE : RIM_IDLE;

  return (
    <div className="contact-name hero-name" ref={row}>
      <span className="hero-name__word" ref={jon} aria-hidden="true">
        Jon
      </span>
      <button
        type="button"
        ref={circle}
        className="hero-circle contact-circle"
        data-copied={copied || undefined}
        aria-label={copied ? "Email copied" : `Copy email address (${email})`}
        onClick={copy}
        onMouseEnter={() => speed(4, 0.4)}
        onMouseLeave={() => speed(1, 0.6)}
      >
        <svg ref={rim} className="hero-circle__rim" viewBox="0 0 200 200" aria-hidden="true">
          <path id="contact-rim-path" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" fill="none" />
          <text className="hero-circle__rim-text">
            <textPath href="#contact-rim-path" startOffset="0%">
              {rimText}
            </textPath>
          </text>
        </svg>
        <span className="contact-circle__icon" aria-hidden="true">
          {copied ? "✓" : "@"}
        </span>
      </button>
      <span className="hero-name__word" ref={cheng} aria-hidden="true">
        cheng
      </span>
      <span className="sr-only" role="status">
        {copied ? "Email copied to clipboard" : ""}
      </span>
    </div>
  );
}
