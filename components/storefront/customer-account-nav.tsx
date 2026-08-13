"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseLinks = [
  { href: "/konto", label: "Übersicht", exact: true },
  { href: "/konto/bestellungen", label: "Bestellungen", exact: false },
  { href: "/konto/adressen", label: "Adressen", exact: false },
  { href: "/konto/passwort", label: "Passwort", exact: false },
  { href: "/konto/datenschutz", label: "Datenschutz", exact: false },
] as const;

const termineLink = {
  href: "/konto/termine",
  label: "Termine",
  exact: false,
} as const;

export function CustomerAccountNav({
  showTermine = false,
}: {
  /** Feature aktiv und Kunde hat mindestens eine Buchung. */
  showTermine?: boolean;
}) {
  const pathname = usePathname() || "/konto";
  const links = showTermine
    ? [
        baseLinks[0],
        baseLinks[1],
        termineLink,
        baseLinks[2],
        baseLinks[3],
        baseLinks[4],
      ]
    : [...baseLinks];

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
