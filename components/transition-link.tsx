"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useTransition,
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
 * Sequencing mirrors components/nav.tsx's own link handling exactly (see
 * that file's own long comment on why `useTransition` is the right tool):
 * intercept the click, start the cover animation from the cursor's current
 * position, kick off `router.push` wrapped in `startTransition` once cover
 * finishes, and only reveal once React's `isPending` flips back to `false`
 * — which only happens once the destination route has actually fetched and
 * mounted, so the reveal always uncovers the real page, never a still-
 * loading placeholder. The one difference from Nav: there, "close the
 * drawer" is the reveal; here, the wipe overlay itself is the thing
 * covering the page, so the reveal is the wipe opening rather than a
 * separate UI element closing.
 */
export function TransitionLink({ href, onClick, children, ref, ...rest }: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startNavigation] = useTransition();
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!isPending && pendingRef.current) {
      pendingRef.current = false;
      getScreenTransition()?.reveal();
    }
  }, [isPending]);

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
      pendingRef.current = true;
      transition.cover({ x, y }).then(() => {
        startNavigation(() => {
          router.push(targetHref);
        });
      });
    },
    [href, onClick, pathname, router],
  );

  return (
    <Link href={href} onClick={handleClick} ref={ref} {...rest}>
      {children}
    </Link>
  );
}
