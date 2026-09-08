export interface NavItem {
  href: string;
  label: string;
}

// Ported from the old site's menu. /me, /experience, /art, and /code don't
// have real pages yet in this rebuild — they'll 404 until those pages are
// built. Edit this list to add, remove, or reorder nav items.
export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/me", label: "About Me" },
  { href: "/experience", label: "Resume" },
  { href: "/art", label: "Art" },
  { href: "/code", label: "Code" },
];
