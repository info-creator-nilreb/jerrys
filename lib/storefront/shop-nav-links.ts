export type StorefrontShopNavLink = {
  href: string;
  label: string;
};

const DEFAULT_MAX_TOP_CATEGORIES = 6;

/** Primärnavigation: Katalog + Top-Level-Kategorien (Epic 10 Slice 4). */
export function buildStorefrontShopNavLinks(
  categories: ReadonlyArray<{ slug: string; title: string }>,
  options?: { maxTopLevel?: number },
): StorefrontShopNavLink[] {
  const max = options?.maxTopLevel ?? DEFAULT_MAX_TOP_CATEGORIES;
  const links: StorefrontShopNavLink[] = [
    { href: "/produkte", label: "Alle Produkte" },
    { href: "/termine", label: "Termine" },
  ];
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
