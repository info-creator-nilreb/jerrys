"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  isStorefrontShopNavLinkActive,
  type StorefrontShopNavLink,
} from "@/lib/storefront/shop-nav-links";

function NavLinkList({
  links,
  pathname,
  onNavigate,
  className,
}: {
  links: readonly StorefrontShopNavLink[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <ul className={className}>
      {links.map(({ href, label }) => {
        const active = isStorefrontShopNavLinkActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={`block text-sm font-medium transition-colors focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                onNavigate ? "flex min-h-11 items-center" : ""
              } ${
                active
                  ? "text-primary"
                  : "text-(--foreground-heading) hover:text-primary"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type Props = {
  links: readonly StorefrontShopNavLink[];
  className?: string;
};

export function StorefrontShopNav({ links, className }: Props) {
  const pathname = usePathname();
  const menuId = useId();
  /** Menü gilt nur für die Route, in der es geöffnet wurde — schließt automatisch bei Navigation. */
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const mobileOpen = menuOpenForPath === pathname;

  const closeMobile = useCallback(() => setMenuOpenForPath(null), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, closeMobile]);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <nav className="hidden md:block" aria-label="Shop">
        <NavLinkList
          links={links}
          pathname={pathname}
          className="flex flex-wrap items-center gap-x-5 gap-y-1"
        />
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-heading) transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-expanded={mobileOpen}
          aria-controls={menuId}
          aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
          onClick={() =>
            setMenuOpenForPath((current) => (current === pathname ? null : pathname))
          }
        >
          {mobileOpen ? (
            <X className="size-6" aria-hidden strokeWidth={1.75} />
          ) : (
            <Menu className="size-6" aria-hidden strokeWidth={1.75} />
          )}
        </button>

        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 top-[var(--storefront-header-height,3.5rem)] z-[499999] bg-black/30"
              aria-label="Menü schließen"
              onClick={closeMobile}
            />
            <nav
              id={menuId}
              className="fixed left-0 right-0 top-[var(--storefront-header-height,3.5rem)] z-[500001] border-b border-(--surface-muted) bg-white px-4 py-4 shadow-sm"
              aria-label="Shop"
            >
              <NavLinkList
                links={links}
                pathname={pathname}
                onNavigate={closeMobile}
                className="flex flex-col gap-4"
              />
            </nav>
          </>
        ) : null}
      </div>
    </div>
  );
}
