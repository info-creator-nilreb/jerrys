import type { BrowseContext } from "@/lib/storefront/browse-context";

type Crumb = { href?: string; label: string };

export type ProductCategoryRef = {
  slug: string;
  title: string;
  parent: { slug: string; title: string } | null;
};

export function truncateBreadcrumbLabel(title: string, max = 52): string {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
}

function categoryTrailItems(category: ProductCategoryRef): Crumb[] {
  const items: Crumb[] = [{ href: "/", label: "Start" }];
  if (category.parent) {
    items.push({
      href: `/kategorien/${category.parent.slug}`,
      label: category.parent.title,
    });
  }
  items.push({
    href: `/kategorien/${category.slug}`,
    label: category.title,
  });
  return items;
}

/**
 * PDP-Brotkrümel gemäß docs/STOREFRONT_BREADCRUMBS.md (Kontext → Primary → Katalog).
 */
export function resolveProductBreadcrumbItems(options: {
  titleCrumb: string;
  browseContext: BrowseContext | null;
  primaryCategory: ProductCategoryRef | null;
  categorySlugs: ReadonlySet<string>;
  collectionSlugs: ReadonlySet<string>;
  categoryBySlug: ReadonlyMap<string, ProductCategoryRef>;
  collectionTitleBySlug: ReadonlyMap<string, string>;
}): Crumb[] {
  const {
    titleCrumb,
    browseContext,
    primaryCategory,
    categorySlugs,
    collectionSlugs,
    categoryBySlug,
    collectionTitleBySlug,
  } = options;

  if (browseContext?.kind === "collection" && collectionSlugs.has(browseContext.slug)) {
    const label =
      browseContext.title ??
      collectionTitleBySlug.get(browseContext.slug) ??
      browseContext.slug;
    return [
      { href: "/", label: "Start" },
      { href: `/kollektionen/${browseContext.slug}`, label },
      { label: titleCrumb },
    ];
  }

  if (browseContext?.kind === "category" && categorySlugs.has(browseContext.slug)) {
    const cat =
      categoryBySlug.get(browseContext.slug) ??
      (browseContext.title
        ? {
            slug: browseContext.slug,
            title: browseContext.title,
            parent: browseContext.parent ?? null,
          }
        : null);
    if (cat) {
      return [...categoryTrailItems(cat), { label: titleCrumb }];
    }
  }

  if (browseContext?.kind === "catalog") {
    return [
      { href: "/", label: "Start" },
      { href: "/produkte", label: "Alle Produkte" },
      { label: titleCrumb },
    ];
  }

  if (primaryCategory) {
    return [...categoryTrailItems(primaryCategory), { label: titleCrumb }];
  }

  return [
    { href: "/", label: "Start" },
    { href: "/produkte", label: "Alle Produkte" },
    { label: titleCrumb },
  ];
}

/** @deprecated Tests — nutze resolveProductBreadcrumbItems */
export function buildStorefrontProductBreadcrumbItems(options: {
  titleCrumb: string;
  primaryCategory: ProductCategoryRef | null;
}): Crumb[] {
  const slug = options.primaryCategory?.slug;
  return resolveProductBreadcrumbItems({
    titleCrumb: options.titleCrumb,
    browseContext: null,
    primaryCategory: options.primaryCategory,
    categorySlugs: new Set(slug ? [slug] : []),
    collectionSlugs: new Set(),
    categoryBySlug: new Map(slug && options.primaryCategory ? [[slug, options.primaryCategory]] : []),
    collectionTitleBySlug: new Map(),
  });
}
