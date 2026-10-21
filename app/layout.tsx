// Mounts the site-wide pieces once: nav, custome gursor, smooth scroll, route wipe and theme

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

/** Unbounded → --font-unbounded. Display face; active one chosen via --font-display in globals.css. */
const displayFont = Unbounded({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jon Cheng",
  description: "Personal website — resume, portfolio, and creative work.",
};

/** Runs before paint: applies stored/system theme to <html>. Prevents wrong-theme flash. */
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
      className={`${displayFont.variable} ${GeistSans.variable}`}
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
