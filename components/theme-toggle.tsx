"use client";

// Light/dark toggle button.
// Fits: in the nav; uses lib/theme-store.

import { useEffect, useState } from "react";
import { getCurrentTheme, toggleTheme, type Theme } from "@/lib/theme-store";

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
