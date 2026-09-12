"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  useCallback,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { getPointerState } from "@/lib/cursor/store";
import { getScreenTransition } from "@/lib/screen-transition-store";

type TransitionLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "onClick"> & {
    children: ReactNode;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    // React 19: a plain function component can declare `ref` as a normal
    // prop (no forwardRef wrapper needed) — hero.tsx passes one through to
    // reach the underlying anchor, same as it did with next/link directly.
    ref?: Ref<HTMLAnchorElement>;
  } & {
    // AnchorHTMLAttributes has no built-in index signature for arbitrary
    // `data-*` props, unlike JSX's blanket allowance for native intrinsic
    // elements — a custom component needs this declared explicitly for a
    // caller (hero.tsx's `data-scroll-fade`) to type-check. Passed straight
    // through via `...rest` below to the underlying `<Link>`/`<a>`.
    [dataAttribute: `data-${string}`]: string | boolean | undefined;
  };

/**
 * Drop-in replacement for next/link that plays the radial lime screen wipe
 * (components/screen-transition.tsx) instead of an instant route swap —
 * "slot in anywhere" per the brief: swap `<Link href="...">` for
 * `<TransitionLink href="...">` at any call site (components/hero.tsx's
 * circle is the first) and the transition just works, no per-site wiring
 * beyond that swap. Everything the transition needs — where to radiate
 * from, when the destination is actually ready — is figured out here.
 *
 * Sequencing intercepts the click, then hands the whole cover → navigate →
 * reveal sequence to `getScreenTransition()?.navigate(...)` — see that
 * method's own doc comment on lib/screen-transition-store.ts's
 * ScreenTransitionController for why it has to be that component, not this
 * one, that owns waiting for `router.push`'s own `isPending` to clear: THIS
 * component is rendered by the page content the navigation is about to
 * replace, so it unmounts partway through, before its own `isPending`
 * could ever be observed going back to `false`. (This file used to run
 * that whole sequence itself, copying components/nav.tsx's own version of
 * the same pattern — Nav can get away with owning it because `<Nav>`,
 * unlike this link's own page content, never unmounts between routes.)
 */
export function TransitionLink({ href, onClick, children, ref, ...rest }: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      // Modifier/middle clicks should behave like a normal link (open in a
      // new tab, etc.) — only a plain left-click gets the wipe treatment;
      // same guard components/nav.tsx uses for its own link interception.
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

      const targetHref = typeof href === "string" ? href : (href.pathname ?? "");
      // Already there — nothing to transition to, let next/link no-op as
      // it normally would rather than playing a wipe that goes nowhere.
      if (targetHref === pathname) return;

      const transition = getScreenTransition();
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // No overlay mounted (shouldn't happen once app/layout.tsx renders
      // it, but a caller shouldn't be left with a dead link if it somehow
      // isn't) or reduced motion — same site-wide rule as everywhere else:
      // reduced motion means the calm, instant, direct outcome, so just
      // fall through to next/link's own plain navigation.
      if (!transition || prefersReducedMotion) return;

      event.preventDefault();
      const { x, y } = getPointerState();
      transition.navigate({ x, y }, () => router.push(targetHref));
    },
    [href, onClick, pathname, router],
  );

  return (
    <Link href={href} onClick={handleClick} ref={ref} {...rest}>
      {children}
    </Link>
  );
}
