// Wrapper for plain content pages (clears fixed nav, declares chrome tone).
// Fits: /me, /experience, /art, 404.

import type { ReactNode } from "react";
import type { ChromeTone } from "@/lib/chrome-tone";
import "./page-shell.css";

/** tone: chrome-tone region; default follows theme. */
export function PageShell({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: ChromeTone;
}) {
  const toneProps = tone
    ? { "data-chrome-tone": tone }
    : {
        "data-chrome-tone-follow-theme": "",
        "data-chrome-tone": "dark-on-light" as ChromeTone,
      };

  return (
    <section className="page-shell" {...toneProps}>
      {children}
    </section>
  );
}
