"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/konto", label: "Übersicht", exact: true },
  { href: "/konto/bestellungen", label: "Bestellungen", exact: false },
  { href: "/konto/adressen", label: "Adressen", exact: false },
  { href: "/konto/datenschutz", label: "Datenschutz", exact: false },
] as const;

export function CustomerAccountNav() {
  const pathname = usePathname() || "/konto";

  return (
    <nav
      aria-label="Konto"
      className="mb-8 mt-4 flex flex-wrap gap-2 border-b border-(--surface-muted) pb-3"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "inline-flex min-h-11 items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white"
                : "inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-(--foreground-heading)"
            }
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
