export type StorefrontShopNavLink = {
  href: string;
  label: string;
};

/** Primärnavigation Storefront: Katalog + aktive Kollektionen (kein leerer Kollektionen-Index). */
export function buildStorefrontShopNavLinks(
  collections: ReadonlyArray<{ slug: string; title: string }>,
): StorefrontShopNavLink[] {
  const links: StorefrontShopNavLink[] = [{ href: "/produkte", label: "Shop" }];
  for (const c of collections) {
    links.push({ href: `/kollektionen/${c.slug}`, label: c.title });
  }
  return links;
}

export function isStorefrontShopNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/produkte") {
    return pathname === "/produkte" || pathname.startsWith("/produkte/");
  }
  if (href.startsWith("/kollektionen/")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}
