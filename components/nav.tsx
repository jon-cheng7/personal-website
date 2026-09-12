"use client";

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
  /**
   * Fired on click of either the real link or its hover-flip clone (both
   * need it — see the comment on the clone's own onClick below for why).
   * Nav uses this to intercept the click, drive the route change itself,
   * and only close the drawer once the destination page has actually
   * mounted — see "seamless nav-to-page transition" in Nav for the full
   * mechanism. Undefined just means "let the Link navigate normally,"
   * which is what every use of MenuLink did before this existed.
   */
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

function MenuLink({ href, label, scroll, onNavigate }: MenuLinkProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    // Animate the letters of the link label to flip up on hover/focus, and back
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
      <div className="menu-link-wrapper" data-chrome-tone="light-on-dark">
        <Link href={href} className="menu-link" scroll={scroll} onClick={onNavigate}>
          {letters}
        </Link>
        {/* Duplicate for animation — also needs onNavigate: during the
            hover-flip timeline above, this clone is what's actually sitting
            visually on top of the real link (see the flip animation), so a
            click while hovering lands on THIS anchor, not the one
            underneath it. */}
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

export function Nav() {
  const container = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  // One region element per row of the liquid wipe (lib/liquid-clip.ts) —
  // see the render below and buildLiquidToneBands's own writeup for why
  // the drawer's chrome-tone region has to be these bands rather than a
  // single tag on `.menu-drawer` itself.
  const toneBandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tl = useRef<ReturnType<typeof gsap.timeline> | null>(null);

  const toggleMenu = () => setIsMenuOpen((open) => !open);

  // The logo's two tone copies — see lib/chrome-tone.ts and the render
  // below. Registered once on mount; the geometry system recomputes their
  // clip-paths on scroll/resize/pointermove/drawer-toggle, not here.
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

  // Seamless nav-to-page transition: Jon's ask was that clicking a link
  // should load the destination page underneath first, THEN close the
  // menu — as if it never left the page — rather than the drawer closing
  // immediately and the new content popping in underneath while (or
  // after) the wipe is already mid-animation. `useTransition` is what
  // makes "underneath first" a real, checkable state rather than a guess:
  // wrapping `router.push` in `startTransition` ties React's own
  // `isNavigating` flag to the App Router's fetch+render of the
  // destination route, so it only flips back to `false` once that route's
  // content has actually mounted in the tree — still fully hidden behind
  // the still-open drawer at that point. Only then do we close, so the
  // wipe reveals the real destination directly.
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isNavigating, startNavigation] = useTransition();
  const pendingNavRef = useRef(false);

  // Home's own opening beat (components/hero.tsx) hides this bar's icon/
  // label/logo for its opening moment, then reveals them back in — see
  // lib/intro-store.ts for the cross-component signal this rides on, since
  // Nav and Hero are siblings under RootLayout with no ref/prop path
  // between them, and Nav (unlike the page content) never unmounts between
  // routes.
  //
  // The initial value here deliberately does NOT consult the intro store —
  // it's derived from `isHome` alone. Nav is mounted once and persists
  // across every client-side navigation, so if it read the store's current
  // phase here it would only get the *first* visit's hidden-until-revealed
  // behavior right; a later navigation back to Home (with the store still
  // sitting at "idle" from the previous visit) would otherwise skip hiding
  // entirely. The effect below re-derives "hidden" from `isHome` itself on
  // every pathname change instead, so the chrome hides on every arrival at
  // Home — matching Hero replaying its own intro on every mount — and the
  // store is consulted only for the *reveal* signal.
  const [chromeRevealed, setChromeRevealed] = useState(() => !isHome);

  useEffect(() => {
    if (!isHome) {
      setChromeRevealed(true);
      return;
    }
    // Force-hidden here, deliberately not `getIntroPhase() !== "hidden"` —
    // this needs to hide on every arrival regardless of whatever phase the
    // store was left in by a previous visit; only Hero's own mount effect
    // (which always runs on every arrival too, and always starts by
    // calling setIntroPhase("hidden") itself) is what the subscription
    // below is waiting to hear the *reveal* half of.
    setChromeRevealed(false);
    return subscribeIntroPhase((phase) => {
      if (phase !== "hidden") setChromeRevealed(true);
    });
  }, [isHome]);

  const handleLinkNavigate = useCallback(
    (href: string, scroll: boolean) =>
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        // Modifier/middle clicks should behave like a normal link (open in
        // a new tab, etc.) — only a plain left-click gets the sequenced
        // navigate-then-close treatment; anything else just falls through
        // to next/link's own default handling.
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

        // Already on this page — nothing to wait for, so there's no
        // "underneath" to load first; just close normally.
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

      // Clip path animation
      const wipe = { progress: 0 };
      const applyWipe = () => {
        if (drawerRef.current) {
          drawerRef.current.style.clipPath = buildLiquidClipPath(
            wipe.progress,
          );
        }
        // Keep the chrome-tone region bands (see the render below) tracking
        // the exact same reveal the clip-path line above just drew — same
        // progress value, same per-row math (lib/liquid-clip.ts), so the
        // "lime revealed" region lib/chrome-tone.ts sees can never drift
        // out of sync with what's actually painted.
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
      // Focus the dialog itself once it's interactive — its aria-label
      // gets announced, then Tab proceeds naturally into the links.
      drawerRef.current?.focus();
    } else {
      tl.current?.reverse();
      getLenisInstance()?.start();
      document.body.style.overflow = "";
    }

    // The drawer's own chrome-tone region (the `.menu-drawer__tone-band`s
    // rendered below) already tracks the wipe's real progress every tick
    // via `applyWipe` above, so nothing extra is needed for that. This call
    // just makes sure lib/chrome-tone.ts's own continuous per-frame loop is
    // actually running right now rather than waiting for its next natural
    // trigger — cheap, and a no-op once it's already going (see
    // requestChromeToneUpdate's own doc comment).
    requestChromeToneUpdate();
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
          {/* scroll={false} for the same reason as the Home nav link above
              — see components/scroll-memory.tsx. Two copies of the same
              white source asset, stacked exactly on top of each other (see
              .menu-logo-mask/.menu-logo-copy in nav.css) — the first
              (light-on-dark, as-is white) also defines the wrapper's
              natural size via normal layout flow; the second (dark-on-
              light) reuses the same proven filter:invert(1) trick from
              earlier rounds to derive black from the one white asset,
              rather than a second image file. Which parts of which copy
              actually show is entirely down to the clip-path the geometry
              system (lib/chrome-tone.ts) applies to each — not this
              markup. */}
          <Link href="/" scroll={false}>
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
        {/* The drawer's own chrome-tone region — NOT a single tag on this
            element (its layout box is always the full viewport regardless
            of how much of the wave has revealed, since clip-path only
            changes what's painted, not the box) but `LIQUID_WIPE_ROWS` thin
            bands, each independently widened to exactly how far the lime
            wipe has *guaranteed* reached at that height, every tick, by the
            same `applyWipe` that drives the visible clip-path above (see
            lib/liquid-clip.ts's `buildLiquidToneBands` for the full
            reasoning). Purely geometry — invisible, `pointer-events: none`
            — lib/chrome-tone.ts reads their boxes via `getBoundingClientRect()`,
            unaffected by this element being inside the clipped drawer.
            `data-chrome-tone-overlay`: this drawer is a fixed-position
            layer stacked visually on top of the page by z-index, not a DOM
            ancestor/descendant of it — see that attribute's own doc
            comment in lib/chrome-tone.ts for the exact bug this avoids
            (the bands tied in DOM depth with the home page's `.hero`
            section and silently lost that tie, leaving the icon/logo
            stuck on the hero's tone with the drawer open over them). */}
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
              {/* No onClick here any more — closing is now driven by
                  handleLinkNavigate/the effect above, once the destination
                  page has actually mounted, not by the click itself. */}
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
