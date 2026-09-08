import Link from "next/link";
import { navItems } from "@/content/nav";

export function Nav() {
  return (
    <nav aria-label="Primary">
      <ul>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
