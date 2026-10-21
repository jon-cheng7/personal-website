// Nav drawer links.
// Fits: components/nav.tsx.

export interface NavItem {
  href: string;
  label: string;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/me", label: "About Me" },
  { href: "/experience", label: "Resume" },
  { href: "/art", label: "Art" },
  { href: "/code", label: "Code" },
];
