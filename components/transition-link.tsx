"use client";

// next/link that plays the screen wipe before navigating.
// Fits: used by hero circle; any link wanting the wipe.

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

/** Same as Link + ref. */
type TransitionLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "onClick"> & {
    children: ReactNode;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    ref?: Ref<HTMLAnchorElement>;
  } & {
    [dataAttribute: `data-${string}`]: string | boolean | undefined;
  };

/** Wipe from pointer pos. Plain nav if modifier key, same page, reduced motion, or no overlay. */
export function TransitionLink({ href, onClick, children, ref, ...rest }: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

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
      if (targetHref === pathname) return;

      const transition = getScreenTransition();
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
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
