"use client";

import { useEffect, useState } from "react";
import { getCurrentTheme, toggleTheme, type Theme } from "@/lib/theme-store";

/**
 * Lives in the nav drawer's footer (see nav.tsx) — the one place on the
 * site that's already a global control panel (social/contact links),
 * rather than adding a new fixed-position element competing with the
 * menu bar's own carefully-tuned scrim/color transitions (see nav.css).
 *
 * Starts as `null` and renders nothing until mounted: the actual theme in
 * effect depends on `prefers-color-scheme` and `localStorage`, neither of
 * which are available during server rendering, so guessing here would
 * either mismatch the server-rendered HTML (a hydration warning) or flash
 * the wrong label for an instant. Cheap to skip entirely for the one
 * render where it'd be wrong.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  if (theme === null) return null;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(toggleTheme())}
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
