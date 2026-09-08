"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { navItems } from "@/content/nav";
import { socialLinks, contactInfo } from "@/content/social";
import "./nav.css";

// Ported from the old site's ui/nav/menu.tsx, same visual styling and
// interaction (hover letter-flip on each link, clip-path wipe open/close
// with a staggered reveal). Adaptations from the original:
// - Link usage modernized (no more `legacyBehavior`/`passHref`).
// - Dropped a dead `import { link } from 'fs'` that was never used
//   (immediately shadowed by the `link` map-callback param anyway).
// - `GSAPTimeline` (an old ambient global type) replaced with
//   `ReturnType<typeof gsap.timeline>`.
// - `gsap`/`useGSAP` now come from the project's centralized `@/lib/gsap`
//   instead of importing the packages directly.
// - The two Tailwind utility combos the original used
//   (`flex flex-col overflow-y-clip`, `absolute top-[100%]`) are now the
//   plain-CSS classes `.menu-link-wrapper` / `.menu-link-clone` in nav.css.
// - Links and social/contact info are pulled from content/nav.ts and
//   content/social.ts instead of being hardcoded here.
// - The three click-to-toggle divs (MENU / CLOSE / the X icon) are now
//   real <button> elements, so the menu is keyboard-operable.
// - Both animations (the hover flip and the open/close reveal) check
//   prefers-reduced-motion and collapse to an instant, non-animated state.

interface MenuLinkProps {
  href: string;
  label: string;
}

function MenuLink({ href, label }: MenuLinkProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const letters = wrapper.querySelectorAll(".menu-letter");
    const tl = gsap
      .timeline({ paused: true, defaults: { ease: "power2.out" } })
      .to(letters, {
        y: "-100%",
        stagger: 0.03,
      });

    const handleMouseEnter = () => tl.play();
    const handleMouseLeave = () => tl.reverse();

    wrapper.addEventListener("mouseenter", handleMouseEnter);
    wrapper.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      wrapper.removeEventListener("mouseenter", handleMouseEnter);
      wrapper.removeEventListener("mouseleave", handleMouseLeave);
      tl.kill();
    };
  }, []);

  const letters = label.split("").map((char, i) => (
    <span key={i} className="menu-letter" style={{ display: "inline-block" }}>
      {char === " " ? " " : char}
    </span>
  ));

  return (
    <div ref={wrapperRef}>
      <div className="menu-link-wrapper">
        <Link href={href} className="menu-link">
          {letters}
        </Link>
        <Link href={href} className="menu-link-clone">
          {letters}
        </Link>
      </div>
    </div>
  );
}

export function Nav() {
  const container = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tl = useRef<ReturnType<typeof gsap.timeline> | null>(null);

  const toggleMenu = () => setIsMenuOpen((open) => !open);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.set(".menu-link-item-holder", { y: prefersReducedMotion ? 0 : 75 });

      tl.current = gsap
        .timeline({ paused: true })
        .to(".menu-overlay", {
          duration: prefersReducedMotion ? 0.01 : 1.25,
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          ease: "power4.inOut",
        })
        .to(".menu-link-item-holder", {
          y: 0,
          duration: prefersReducedMotion ? 0.01 : 1,
          stagger: prefersReducedMotion ? 0 : 0.1,
          ease: "power4.out",
          delay: prefersReducedMotion ? 0 : -0.75,
        });
    },
    { scope: container },
  );

  useEffect(() => {
    if (isMenuOpen) {
      tl.current?.play();
    } else {
      tl.current?.reverse();
    }
  }, [isMenuOpen]);

  return (
    <div className="menu-container" ref={container}>
      <div className="menu-bar">
        <div className="menu-logo">
          <Link href="/">
            <Image
              src="/Signature_white.png"
              alt="Home"
              width={40}
              height={40}
            />
          </Link>
        </div>
        <button type="button" className="menu-open" onClick={toggleMenu}>
          <p>MENU</p>
        </button>
      </div>

      <div className="menu-overlay" aria-hidden={!isMenuOpen}>
        <div className="menu-overlay-bar">
          <div className="menu-logo">
            <Link href="/">
              <Image
                src="/Signature_black.png"
                alt="Home"
                width={40}
                height={40}
              />
            </Link>
          </div>
          <button type="button" className="menu-close" onClick={toggleMenu}>
            <p>CLOSE</p>
          </button>
        </div>

        <button
          type="button"
          className="menu-close-icon"
          onClick={toggleMenu}
        >
          <p>&#x2715;</p>
        </button>

        <div className="menu-copy">
          <div className="menu-links">
            {navItems.map((item) => (
              <div key={item.href} className="menu-link-item">
                <div className="menu-link-item-holder" onClick={toggleMenu}>
                  <MenuLink href={item.href} label={item.label} />
                </div>
              </div>
            ))}
          </div>
          <div className="menu-info">
            <div className="menu-info-col">
              {socialLinks.map((social) => (
                <a key={social.label} href={social.href}>
                  {social.label} &#8599;
                </a>
              ))}
            </div>
            <div className="menu-info-col">
              <p>{contactInfo.email}</p>
              <p>{contactInfo.phone}</p>
            </div>
          </div>
        </div>
        <div className="menu-preview" />
      </div>
    </div>
  );
}
