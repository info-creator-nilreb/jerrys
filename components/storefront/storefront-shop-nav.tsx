"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const shopLinks = [
  { href: "/produkte", label: "Produkte" },
  { href: "/kollektionen", label: "Kollektionen" },
] as const;

function isShopLinkActive(pathname: string, href: string): boolean {
  if (href === "/produkte") {
    return pathname === "/produkte" || pathname.startsWith("/produkte/");
  }
  if (href === "/kollektionen") {
    return pathname === "/kollektionen" || pathname.startsWith("/kollektionen/");
  }
  return pathname === href;
}

export function StorefrontShopNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Shop">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-5">
        {shopLinks.map(({ href, label }) => {
          const active = isShopLinkActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`text-sm font-medium transition-colors focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
    </nav>
  );
}
