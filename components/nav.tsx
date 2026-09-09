"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { getLenisInstance } from "@/lib/lenis-store";
import { buildLiquidClipPath } from "@/lib/liquid-clip";
import { navItems } from "@/content/nav";
import { socialLinks, contactInfo } from "@/content/social";
import { ThemeToggle } from "@/components/theme-toggle";
import "./nav.css";


interface MenuLinkProps {
  href: string;
  label: string;
  /**
   * Passed straight to next/link's `scroll` prop. Home passes `false` so
   * Next doesn't scroll-to-top on the way in — components/scroll-memory.tsx
   * restores that page's own remembered position instead, and the two
   * would otherwise race. Defaults to true for every
   * other link, which should still land at the top of a fresh page.
   */
  scroll?: boolean;
}

function MenuLink({ href, label, scroll }: MenuLinkProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    // Animate the letters of the link label to flip up on hover/focus, and back
    const letters = wrapper.querySelectorAll(".menu-letter");
    const realLetters = wrapper.querySelectorAll(".menu-link:not(.menu-link-clone) .menu-letter");
    const cloneLetters = wrapper.querySelectorAll(".menu-link-clone .menu-letter");


    const tl = gsap
      .timeline({ paused: true, defaults: { ease: "power4.out", stagger: 0.03 } })
      .to(realLetters, { y: "-130%" }, 0)   // travels further up than before — more clearance
      .to(cloneLetters, { y: "-130%" }, 0); // still lands flush, since its start point changes below

    const play = () => tl.play();
    const reverse = () => tl.reverse();

    // Both mouse hover and keyboard focus trigger the same flip — the
    // wrapper only contains one real (tabbable) link, so focusin/focusout
    // fire exactly when that link gains/loses focus.
    wrapper.addEventListener("mouseenter", play);
    wrapper.addEventListener("mouseleave", reverse);
    wrapper.addEventListener("focusin", play);
    wrapper.addEventListener("focusout", reverse);

    return () => {
      wrapper.removeEventListener("mouseenter", play);
      wrapper.removeEventListener("mouseleave", reverse);
      wrapper.removeEventListener("focusin", play);
      wrapper.removeEventListener("focusout", reverse);
      tl.kill();
    };
  }, []);

  const letters = label.split("").map((char, i) => (
    <span key={i} className="menu-letter" style={{ display: "inline-block" }}>
      {/* A plain " " inside an inline-block span collapses to zero width
          (whitespace collapsing treats it as insignificant) — invisible at
          the old, smaller nav-link size, but an obvious missing word-gap at
          the current display-type scale. A non-breaking space has real
          glyph width and isn't collapsible, so it renders correctly at any
          size. */}
      {char === " " ? " " : char}
    </span>
  ));

  return (
    <div ref={wrapperRef}>
      <div className="menu-link-wrapper">
        <Link href={href} className="menu-link" scroll={scroll}>
          {letters}
        </Link>
        {/* Duplicate for animation */}
        <Link
          href={href}
          className="menu-link-clone"
          aria-hidden="true"
          tabIndex={-1}
          scroll={scroll}
        >
          {letters}
        </Link>
      </div>
    </div>
  );
}

export function Nav() {
  const container = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tl = useRef<ReturnType<typeof gsap.timeline> | null>(null);

  const toggleMenu = () => setIsMenuOpen((open) => !open);

  const closeAndReturnFocus = useCallback(() => {
    setIsMenuOpen(false);
    openButtonRef.current?.focus();
  }, []);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.set(".menu-link-item", {
        x: prefersReducedMotion ? 0 : -100, 
        autoAlpha: prefersReducedMotion ? 1 : 0,
      });

      // Clip path animation
      const wipe = { progress: 0 };
      const applyWipe = () => {
        if (drawerRef.current) {
          drawerRef.current.style.clipPath = buildLiquidClipPath(
            wipe.progress,
          );
        }
      };
      applyWipe();

      tl.current = gsap
        .timeline({ paused: true })
        .to(wipe, {
          progress: 1,
          duration: prefersReducedMotion ? 0.01 : 1,
          ease: "power2.inOut",
          onUpdate: applyWipe,
        })
        .to(
          ".menu-link-item",
          {
            duration: prefersReducedMotion ? 0.01 : 0.5, 
            x: 0,
            autoAlpha: 1,
            stagger: prefersReducedMotion ? 0 : 0.06,
            ease: "power3.out",
          },
          prefersReducedMotion ? 0 : 0.2,
        );
    },
    { scope: container },
  );

  useEffect(() => {
    if (isMenuOpen) {
      tl.current?.play();
      getLenisInstance()?.stop();
      document.body.style.overflow = "hidden";
      // Focus the dialog itself once it's interactive — its aria-label
      // gets announced, then Tab proceeds naturally into the links.
      drawerRef.current?.focus();
    } else {
      tl.current?.reverse();
      getLenisInstance()?.start();
      document.body.style.overflow = "";
    }

    // Mirrors the `data-theme` pattern in lib/theme-store.ts — an attribute
    // on <html> itself rather than on this component's own container, so
    // anything mounted elsewhere in the tree (components/custom-cursor.tsx,
    // specifically) can react to the drawer's open state via a plain CSS
    // attribute selector without needing to be a DOM descendant/sibling of
    // .menu-container or read React state. Currently only the cursor's
    // guaranteed-contrast override (custom-cursor.css) depends on this.
    document.documentElement.dataset.navOpen = isMenuOpen ? "true" : "false";
  }, [isMenuOpen]);

  // Escape closes the menu; Tab is kept inside the drawer while it's open.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndReturnFocus();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, closeAndReturnFocus]);

  return (
    <div
      className="menu-container"
      ref={container}
      data-open={isMenuOpen ? "true" : "false"}
    >
      <div className="menu-bar">
        <button
          type="button"
          className="menu-open"
          ref={openButtonRef}
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="site-menu"
        >
          <span
            className={`menu-open-icon${isMenuOpen ? " is-active" : ""}`}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </span>
          <span className="menu-open-label">
            {isMenuOpen ? "Close" : "Menu"}
          </span>
        </button>
        <div className="menu-logo">
          {/* scroll={false} for the same reason as the Home nav link above
              — see components/scroll-memory.tsx. */}
          <Link href="/" scroll={false}>
            <Image
              src="/Signature_white.png"
              alt="Home"
              width={40}
              height={40}
              className="menu-logo-img"
            />
          </Link>
        </div>
      </div>

      <div
        id="site-menu"
        className="menu-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
        tabIndex={-1}
      >
        <nav className="menu-links" aria-label="Primary">
          {navItems.map((item) => (
            <div key={item.href} className="menu-link-item">
              <div
                className="menu-link-item-holder"
                onClick={closeAndReturnFocus}
              >
                <MenuLink
                  href={item.href}
                  label={item.label}
                  scroll={item.href !== "/"}
                />
              </div>
            </div>
          ))}
        </nav>

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
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
