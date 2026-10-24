// Light/dark theme: stored choice or system preference.
// Fits: ThemeToggle, layout no-flash script, chrome-tone.

import { requestChromeToneUpdate } from "@/lib/chrome-tone";

const STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Explicit choice or null. */
export function getStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Stored, else system. */
export function getCurrentTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (isTheme(explicit)) return explicit;
  return systemPrefersDark() ? "dark" : "light";
}

/** Set <html data-theme>, persist, update chrome tone. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.chromeTone = theme === "dark" ? "light-on-dark" : "dark-on-light";
  requestChromeToneUpdate();
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
  }
}

/** Flip + apply. */
export function toggleTheme(): Theme {
  const next: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
