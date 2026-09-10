/**
 * Small helper around the `data-theme` attribute on `<html>` — the same
 * "attribute set by JS, read by CSS selectors" pattern nav.tsx already uses
 * for `data-open` (see nav.css). Kept as its own module, same reasoning as
 * lib/lenis-store.ts: a concern any component might need to read or write,
 * without every caller reaching into `document` directly.
 *
 * `null`/absent means "no explicit choice yet" — globals.css's
 * `prefers-color-scheme` block handles that case on its own, so this module
 * only needs to act once a visitor (or a future toggle) makes an explicit
 * choice. That choice is persisted to localStorage and re-applied
 * synchronously before paint via the inline script in app/layout.tsx, so
 * there's no flash of the wrong theme on a repeat visit.
 *
 * `applyTheme` also keeps the ambient `data-chrome-tone` (lib/chrome-tone.ts)
 * in sync with the theme it just set — same mapping as the inline script in
 * app/layout.tsx (dark → light-on-dark chrome, light → dark-on-light) — so
 * toggling the theme live updates nav/cursor legibility immediately rather
 * than only on next load.
 */

import { requestChromeToneUpdate } from "@/lib/chrome-tone";

const STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** The visitor's own explicit choice, if they've made one — not the system default. */
export function getStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // Private browsing / storage disabled — fall back to no stored preference.
    return null;
  }
}

/** What's actually in effect right now: the explicit `data-theme`, or the system preference. */
export function getCurrentTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (isTheme(explicit)) return explicit;
  return systemPrefersDark() ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.chromeTone = theme === "dark" ? "light-on-dark" : "dark-on-light";
  // The ambient tag on <html> just changed, which the continuous per-frame
  // loop (see lib/chrome-tone.ts) would pick up on its own within a frame
  // anyway — this just makes sure the loop is actually running right now
  // rather than waiting on that.
  requestChromeToneUpdate();
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Best-effort — the attribute is already set for this page view either way.
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
