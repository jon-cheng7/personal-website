"use client";

// Site nav: fixed MENU/logo chrome + full-screen lime drawer (liquid wipe).
// Fits: mounted once in layout. Chrome colors via chrome-tone; links from content/nav.ts.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { getLenisInstance } from "@/lib/lenis-store";
import { buildLiquidClipPath, buildLiquidToneBands, LIQUID_WIPE_ROWS } from "@/lib/liquid-clip";
import { registerToneTarget, requestChromeToneUpdate } from "@/lib/chrome-tone";
import { subscribeIntroPhase } from "@/lib/intro-store";
import { navItems } from "@/content/nav";
import { socialLinks, contactInfo } from "@/content/social";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChromeToneMask } from "@/components/chrome-tone-mask";
import "./nav.css";
import { TransitionLink } from "./transition-link";

/** scroll: passed to next/link (Home = false for ScrollMemory). */
interface MenuLinkProps {
  href: string;
  label: string;
  scroll?: boolean;
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

/** Big numbered drawer link with per-letter hover flip. */
function MenuLink({ href, label, scroll, onNavigate }: MenuLinkProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const realLetters = wrapper.querySelectorAll(".menu-link:not(.menu-link-clone) .menu-letter");
    const cloneLetters = wrapper.querySelectorAll(".menu-link-clone .menu-letter");

    const tl = gsap
      .timeline({ paused: true, defaults: { ease: "power4.out", stagger: 0.03 } })
      .to(realLetters, { y: "-130%" }, 0)   
      .to(cloneLetters, { y: "-130%" }, 0); 

    const play = () => tl.play();
    const reverse = () => tl.reverse();

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
      {char === " " ? " " : char}
    </span>
  ));

  return (
    <div ref={wrapperRef}>
      <div className="menu-link-wrapper" data-chrome-tone="light-on-dark">
        <Link href={href} className="menu-link" scroll={scroll} onClick={onNavigate}>
          {letters}
        </Link>
        <Link
          href={href}
          className="menu-link-clone"
          aria-hidden="true"
          tabIndex={-1}
          scroll={scroll}
          onClick={onNavigate}
        >
          {letters}
        </Link>
      </div>
    </div>
  );
}

/** Drawer open/close, focus trap, Escape, scroll lock, close-after-route-mount. */
export function Nav() {
  const container = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const toneBandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tl = useRef<ReturnType<typeof gsap.timeline> | null>(null);

  const toggleMenu = () => setIsMenuOpen((open) => !open);

  const logoMaskRef = useRef<HTMLSpanElement>(null);
  const logoLightOnDarkRef = useRef<HTMLImageElement>(null);
  const logoDarkOnLightRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrapper = logoMaskRef.current;
    const lightOnDark = logoLightOnDarkRef.current;
    const darkOnLight = logoDarkOnLightRef.current;
    if (!wrapper || !lightOnDark || !darkOnLight) return;
    return registerToneTarget(wrapper, {
      "light-on-dark": lightOnDark,
      "dark-on-light": darkOnLight,
    });
  }, []);

  const closeAndReturnFocus = useCallback(() => {
    setIsMenuOpen(false);
    openButtonRef.current?.focus();
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isNavigating, startNavigation] = useTransition();
  const pendingNavRef = useRef(false);

  const [chromeRevealed, setChromeRevealed] = useState(() => !isHome);

  useEffect(() => {
    if (!isHome) {
      setChromeRevealed(true);
      return;
    }
    setChromeRevealed(false);
    return subscribeIntroPhase((phase) => {
      if (phase !== "hidden") setChromeRevealed(true);
    });
  }, [isHome]);

  const handleLinkNavigate = useCallback(
    (href: string, scroll: boolean) =>
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();

        if (href === pathname) {
          closeAndReturnFocus();
          return;
        }

        pendingNavRef.current = true;
        startNavigation(() => {
          router.push(href, { scroll });
        });
      },
    [pathname, router, closeAndReturnFocus],
  );

  useEffect(() => {
    if (!isNavigating && pendingNavRef.current) {
      pendingNavRef.current = false;
      closeAndReturnFocus();
    }
  }, [isNavigating, closeAndReturnFocus]);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.set(".menu-link-item", {
        x: prefersReducedMotion ? 0 : -100, 
        autoAlpha: prefersReducedMotion ? 1 : 0,
      });

      const wipe = { progress: 0 };
      const applyWipe = () => {
        if (drawerRef.current) {
          drawerRef.current.style.clipPath = buildLiquidClipPath(
            wipe.progress,
          );
        }
        const bands = buildLiquidToneBands(wipe.progress);
        toneBandRefs.current.forEach((band, i) => {
          if (band) band.style.width = `${(bands[i].reveal * 100).toFixed(2)}%`;
        });
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
      drawerRef.current?.focus();
    } else {
      tl.current?.reverse();
      getLenisInstance()?.start();
      document.body.style.overflow = "";
    }

    requestChromeToneUpdate();
  }, [isMenuOpen]);

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
      <div className="menu-bar" data-intro-hidden={chromeRevealed ? undefined : "true"}>
        <button
          type="button"
          className="menu-open"
          ref={openButtonRef}
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="site-menu"
        >
          <ChromeToneMask
            className="menu-open-icon-mask"
            palette={{ "light-on-dark": "#ffffff", "dark-on-light": "#000000" }}
          >
            <span
              className={`menu-open-icon${isMenuOpen ? " is-active" : ""}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>
          </ChromeToneMask>
          <ChromeToneMask
            className="menu-open-label"
            palette={{ "light-on-dark": "#ffffff", "dark-on-light": "#000000" }}
          >
            {isMenuOpen ? "Close" : "Menu"}
          </ChromeToneMask>
        </button>
        <div className="menu-logo">
          <TransitionLink href="/" scroll={false}>
            <span ref={logoMaskRef} className="menu-logo-mask">
              <Image
                ref={logoLightOnDarkRef}
                src="/Signature_white.png"
                alt="Home"
                width={40}
                height={40}
                className="menu-logo-copy"
              />
              <Image
                ref={logoDarkOnLightRef}
                src="/Signature_white.png"
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                className="menu-logo-copy menu-logo-copy--dark-on-light"
              />
            </span>
          </TransitionLink>
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
        <div className="menu-drawer__tone-bands" aria-hidden="true">
          {Array.from({ length: LIQUID_WIPE_ROWS }).map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                toneBandRefs.current[i] = el;
              }}
              className="menu-drawer__tone-band"
              style={{
                top: `${(i / LIQUID_WIPE_ROWS) * 100}%`,
                height: `${(1 / LIQUID_WIPE_ROWS) * 100}%`,
              }}
              data-chrome-tone="dark-on-light"
              data-chrome-tone-overlay
            />
          ))}
        </div>

        <nav className="menu-links" aria-label="Primary">
          {navItems.map((item) => (
            <div key={item.href} className="menu-link-item">
              <div className="menu-link-item-holder">
                <MenuLink
                  href={item.href}
                  label={item.label}
                  scroll={item.href !== "/"}
                  onNavigate={handleLinkNavigate(item.href, item.href !== "/")}
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
