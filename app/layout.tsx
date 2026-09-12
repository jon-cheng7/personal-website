import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Unbounded } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Nav } from "@/components/nav";
import { SmoothScroll } from "@/components/smooth-scroll";
import { GlobalCursor } from "@/components/cursor/global-cursor";
import { ScreenTransition } from "@/components/screen-transition";
import Script from "next/script";

// Display font for bold, oversized moments — currently just the full-screen
// nav's link labels (see components/nav.css). next/font self-hosts it at
// build time, so there's no external request and no separate licensing
// question: Unbounded is Google-Fonts-hosted and OFL-licensed, free for
// commercial use. Only pulling the weights actually used keeps the subset
// small.
//
// Both this and GeistSans below expose their own fixed CSS variable
// (`--font-unbounded`, `--font-geist-sans`) rather than being applied
// globally, so trying a font is opt-in per element rather than overriding
// body text everywhere. Neither is referenced by name anywhere in nav.css
// or hero.css — both read `var(--font-display)` only. Which one that
// redirects to is a single line in app/globals.css (see the comment
// there) — that's the actual hot-swap point, not this file. This file is
// just "which fonts are loaded and available," not "which one is active."
const displayFont = Unbounded({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

// Geist's font objects (unlike next/font/google's Unbounded above) are
// already fully instantiated — no options to pass, no weight array to
// pick, since Geist Sans is a variable font shipping every weight in one
// file. Its own `.variable` name (`--font-geist-sans`, imported at the top
// of this file) is fixed by the package, which is exactly why the
// `--font-display` redirect in globals.css exists — that's the one place
// that needs to change to try this instead of Unbounded, not this file.

export const metadata: Metadata = {
  title: "Jon Cheng",
  description: "Personal website — resume, portfolio, and creative work.",
};

// Applies a stored theme choice (see lib/theme-store.ts, components/
// theme-toggle.tsx) to <html> before the browser paints anything — a
// regular useEffect in a React component would only run after the first
// paint, so a returning visitor with dark mode chosen would see a flash of
// the light theme for a frame first. Plain inline script, not a Next
// script strategy, deliberately: this has to run synchronously and
// blocking, before paint, which is the opposite of what defer/async
// script loading is for. Wrapped in try/catch since localStorage can throw
// (private browsing, storage disabled) — falls back to no explicit
// data-theme, which just means globals.css's prefers-color-scheme block
// decides instead, still a correct (if system-default) result.
//
// Also sets the ambient `data-chrome-tone` (see lib/chrome-tone.ts) to
// match — dark backgrounds need white/lime chrome (`light-on-dark`), light
// backgrounds need black chrome (`dark-on-light`) — using the exact same
// resolution order as app/globals.css's own theme rules (explicit
// data-theme first, system prefers-color-scheme otherwise) so the two
// never disagree. This is only the sitewide *ambient* tone; any section
// with its own fixed background (the home hero, the 404 page) tags itself
// directly and wins for its own area regardless of theme — see
// components/horizontal-scroll.tsx / not-found-scene.tsx.
const noFlashThemeScript = `
  try {
    var stored = localStorage.getItem('theme');
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.dataset.theme = stored;
    }
    document.documentElement.dataset.chromeTone = theme === 'dark' ? 'light-on-dark' : 'dark-on-light';
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      // Both fonts' own CSS variables are exposed here regardless of which
      // one is actually active — app/globals.css's `--font-display`
      // redirect (not this className) is what decides which one anything
      // using `var(--font-display)` actually renders in.
      className={`${displayFont.variable} ${GeistSans.variable}`}
      // The inline script below intentionally mutates this element's
      // `data-theme` attribute before React hydrates, so its attributes
      // never quite match what React itself rendered on the server. That
      // mismatch is expected and harmless here (React doesn't manage this
      // attribute at all, on either side), so it's suppressed rather than
      // logged as a hydration error every load. Scoped to just this
      // element — not a blanket suppression — so a real mismatch anywhere
      // else in the tree still surfaces normally.
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: noFlashThemeScript }}
        />
      </head>
      <body>
        <SmoothScroll />
        {/* Mounted once, persists across every route change (same reasoning
            as GlobalCursor just above) — see components/screen-transition.tsx
            and lib/screen-transition-store.ts for why a transition already
            in flight must never be interrupted by the very navigation it's
            driving. */}
        <ScreenTransition />
        <GlobalCursor />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
