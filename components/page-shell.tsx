import type { ReactNode } from "react";
import type { ChromeTone } from "@/lib/chrome-tone";
import "./page-shell.css";

/**
 * Minimal shared wrapper for the site's plain content pages — see
 * page-shell.css for what it actually does (mostly: clear the fixed nav
 * bar). Used by app/me, app/experience, and app/art for now; reach for
 * this again for any future page that's normal scrollable content rather
 * than the home page's own horizontal-scroll treatment.
 *
 * Also the single place these pages declare their `data-chrome-tone`
 * region for the fixed nav's MENU/CLOSE label, hamburger/X icon, and JON
 * logo (see lib/chrome-tone.ts) — previously nothing here tagged a region
 * at all, so the nav chrome had only the ambient `<html>` tag to resolve
 * against on these routes, which wasn't reliable. By default this section
 * has no background of its own (see page-shell.css) — it's whatever the
 * sitewide theme currently is — so by default it opts into
 * `data-chrome-tone-follow-theme`, which keeps its tone mirrored to the
 * site's current light/dark theme automatically (see
 * lib/chrome-tone.ts's `syncThemeFollowers`), with no per-page theme logic
 * needed. Any future page built on PageShell gets this for free. A page
 * that instead has its own fixed background (like the home hero or the
 * 404 page) should pass `tone` explicitly instead — same idea as those
 * pages tagging themselves directly, just plumbed through this shared
 * wrapper. Either way, a nested section inside `children` can still tag
 * itself with its own `data-chrome-tone` to override this for its own
 * area — regions resolve by DOM depth, not by where the ancestor's tone
 * came from.
 */
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
        // Starting value only — kept in sync with the real theme every
        // frame once JS runs (see lib/chrome-tone.ts); matches the
        // light-theme default in app/globals.css so it's already correct
        // in the common case even before that first sync.
        "data-chrome-tone": "dark-on-light" as ChromeTone,
      };

  return (
    <section className="page-shell" {...toneProps}>
      {children}
    </section>
  );
}
