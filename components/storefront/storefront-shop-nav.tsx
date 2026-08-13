"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  useStorefrontHeaderOverlayLock,
  useStorefrontHeaderUi,
} from "@/components/storefront/storefront-header-ui";
import type { DesktopShopNavMode } from "@/lib/shop/shop-settings-defaults";
import {
  isStorefrontShopNavLinkActive,
  type StorefrontShopNavLink,
} from "@/lib/storefront/shop-nav-links";

function NavLinkList({
  links,
  pathname,
  onNavigate,
  className,
  inactiveClassName,
}: {
  links: readonly StorefrontShopNavLink[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
  inactiveClassName: string;
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
              } ${active ? "text-primary" : inactiveClassName}`}
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

/** Desktop-Linkzeile (md+), z. B. zentriert unter dem Logo. */
export function StorefrontShopNavInlineLinks({
  links,
  className,
}: {
  links: readonly StorefrontShopNavLink[];
  className?: string;
}) {
  const pathname = usePathname();
  const { navInactiveClassName } = useStorefrontHeaderUi();

  if (links.length === 0) {
    return null;
  }

  return (
    <nav className={className ?? "hidden md:block"} aria-label="Shop">
      <NavLinkList
        links={links}
        pathname={pathname}
        inactiveClassName={navInactiveClassName}
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
      />
    </nav>
  );
}

type Props = {
  links: readonly StorefrontShopNavLink[];
  /** Desktop: ausgeblendet, Inline-Links oder Burger. Mobil: immer Burger, sofern Links. */
  desktopMode?: DesktopShopNavMode;
  className?: string;
};

export function StorefrontShopNav({
  links,
  desktopMode = "inline",
  className,
}: Props) {
  const pathname = usePathname();
  const menuId = useId();
  const { controlClassName, navInactiveClassName } = useStorefrontHeaderUi();
  /** Menü gilt nur für die Route, in der es geöffnet wurde — schließt automatisch bei Navigation. */
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const drawerOpen = menuOpenForPath === pathname;
  useStorefrontHeaderOverlayLock("shop-nav", drawerOpen);

  const closeDrawer = useCallback(() => setMenuOpenForPath(null), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen, closeDrawer]);

  if (links.length === 0) {
    return null;
  }

  const showDesktopInline = desktopMode === "inline";
  const showDesktopBurger = desktopMode === "burger";
  /** Mobil immer Burger; Desktop nur im Burger-Modus. */
  const burgerWrapperClass = showDesktopBurger ? "" : "md:hidden";

  return (
    <div className={className}>
      {showDesktopInline ? (
        <nav className="hidden md:block" aria-label="Shop">
          <NavLinkList
            links={links}
            pathname={pathname}
            inactiveClassName={navInactiveClassName}
            className="flex flex-wrap items-center gap-x-5 gap-y-1"
          />
        </nav>
      ) : null}

      <div className={burgerWrapperClass}>
        <button
          type="button"
          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${controlClassName}`}
          aria-expanded={drawerOpen}
          aria-controls={menuId}
          aria-label={drawerOpen ? "Menü schließen" : "Menü öffnen"}
          onClick={() =>
            setMenuOpenForPath((current) => (current === pathname ? null : pathname))
          }
        >
          {drawerOpen ? (
            <X className="size-6" aria-hidden strokeWidth={1.75} />
          ) : (
            <Menu className="size-6" aria-hidden strokeWidth={1.75} />
          )}
        </button>

        {drawerOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 top-[var(--storefront-header-height,3.5rem)] z-[499999] bg-black/30"
              aria-label="Menü schließen"
              onClick={closeDrawer}
            />
            <nav
              id={menuId}
              className="fixed left-0 right-0 top-[var(--storefront-header-height,3.5rem)] z-[500001] border-b border-(--surface-muted) bg-white px-4 py-4 shadow-sm"
              aria-label="Shop"
            >
              <NavLinkList
                links={links}
                pathname={pathname}
                onNavigate={closeDrawer}
                inactiveClassName="text-(--foreground-heading) hover:text-primary"
                className="flex flex-col gap-4"
              />
            </nav>
          </>
        ) : null}
      </div>
    </div>
  );
}
