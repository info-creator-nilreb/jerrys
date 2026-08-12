export type StorefrontShopNavLink = {
  href: string;
  label: string;
};

const DEFAULT_MAX_TOP_CATEGORIES = 6;

export type StorefrontShopNavOptions = {
  maxTopLevel?: number;
  /** Systemlink „Alle Produkte“ — Shopify-ähnlich optional im Menü. Default true. */
  showAllProducts?: boolean;
  /** Systemlink „Termine“ — optional im Menü. Default true. */
  showTermine?: boolean;
};

/** Primärnavigation: optionale Systemlinks + Top-Level-Kategorien (maßgeblich). */
export function buildStorefrontShopNavLinks(
  categories: ReadonlyArray<{ slug: string; title: string }>,
  options?: StorefrontShopNavOptions,
): StorefrontShopNavLink[] {
  const max = options?.maxTopLevel ?? DEFAULT_MAX_TOP_CATEGORIES;
  const showAllProducts = options?.showAllProducts ?? true;
  const showTermine = options?.showTermine ?? true;
  const links: StorefrontShopNavLink[] = [];
  if (showAllProducts) {
    links.push({ href: "/produkte", label: "Alle Produkte" });
  }
  if (showTermine) {
    links.push({ href: "/termine", label: "Termine" });
  }
  for (const c of categories.slice(0, max)) {
    links.push({ href: `/kategorien/${c.slug}`, label: c.title });
  }
  return links;
}

/** Footer / Merchandising: aktive Kollektionen (nicht Header-Primary-Nav). */
export function buildStorefrontMerchandisingLinks(
  collections: ReadonlyArray<{ slug: string; title: string }>,
): StorefrontShopNavLink[] {
  return collections.map((c) => ({
    href: `/kollektionen/${c.slug}`,
    label: c.title,
  }));
}

/**
 * Kollektions-Links ohne Label-Doppelung zur Shop-Nav (z. B. Kategorie + gleichnamige Kollektion).
 * Wenn alle Kollektionen kollidieren, bleibt ein Index-Link „Kollektionen“.
 */
export function resolveFooterMerchandisingLinks(
  shopLinks: ReadonlyArray<StorefrontShopNavLink>,
  collections: ReadonlyArray<{ slug: string; title: string }>,
): StorefrontShopNavLink[] {
  const merchandising = buildStorefrontMerchandisingLinks(collections);
  if (merchandising.length === 0) return [];

  const shopLabels = new Set(
    shopLinks.map((l) => l.label.trim().toLocaleLowerCase("de")),
  );
  const unique = merchandising.filter(
    (l) => !shopLabels.has(l.label.trim().toLocaleLowerCase("de")),
  );
  if (unique.length > 0) return unique;
  return [{ href: "/kollektionen", label: "Kollektionen" }];
}

export function isStorefrontShopNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/produkte") {
    return pathname === "/produkte" || pathname.startsWith("/produkte/");
  }
  if (href === "/termine") {
    return pathname === "/termine" || pathname.startsWith("/termine/");
  }
  if (href.startsWith("/kategorien/")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href.startsWith("/kollektionen/")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}
