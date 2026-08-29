import { publicPathForContentSlug } from "@/lib/content/reserved-slugs";
import { HERO_CTA_TARGET_PRESETS } from "@/lib/content/hero-cta-targets";

export const CMS_LINK_TARGET_CUSTOM_VALUE = "__custom__" as const;
export const CMS_LINK_TARGET_EXTERNAL_VALUE = "__external__" as const;

export type CmsLinkTargetGroup =
  | "system"
  | "page"
  | "collection"
  | "category"
  | "product";

export type CmsLinkTargetOption = {
  href: string;
  label: string;
  group: CmsLinkTargetGroup;
};

export const CMS_LINK_TARGET_GROUP_LABELS: Record<CmsLinkTargetGroup, string> = {
  system: "System",
  page: "Seiten",
  collection: "Kollektionen",
  category: "Kategorien",
  product: "Produkte",
};

export type CmsLinkTargetCatalog = {
  pages: Array<{ slug: string; title: string; status?: string }>;
  collections: Array<{ slug: string; title: string }>;
  categories: Array<{ slug: string; title: string }>;
  products: Array<{ slug: string; title: string }>;
};

export function buildCmsLinkTargetOptions(catalog: CmsLinkTargetCatalog): CmsLinkTargetOption[] {
  const options: CmsLinkTargetOption[] = HERO_CTA_TARGET_PRESETS.map((p: (typeof HERO_CTA_TARGET_PRESETS)[number]) => ({
    href: p.href,
    label: p.label,
    group: "system" as const,
  }));

  for (const page of catalog.pages) {
    options.push({
      href: publicPathForContentSlug(page.slug),
      label:
        page.status && page.status !== "published"
          ? `${page.title} (${page.status})`
          : page.title,
      group: "page",
    });
  }

  for (const collection of catalog.collections) {
    options.push({
      href: `/kollektionen/${collection.slug}`,
      label: collection.title,
      group: "collection",
    });
  }

  for (const category of catalog.categories) {
    options.push({
      href: `/kategorien/${category.slug}`,
      label: category.title,
      group: "category",
    });
  }

  for (const product of catalog.products) {
    options.push({
      href: `/produkte/${product.slug}`,
      label: product.title,
      group: "product",
    });
  }

  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.href)) return false;
    seen.add(option.href);
    return true;
  });
}

export function resolveCmsLinkTargetSelectValue(
  href: string,
  options: readonly CmsLinkTargetOption[],
  config?: { allowExternal?: boolean },
): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (options.some((o) => o.href === trimmed)) return trimmed;
  if (config?.allowExternal && trimmed.startsWith("https://")) {
    return CMS_LINK_TARGET_EXTERNAL_VALUE;
  }
  return CMS_LINK_TARGET_CUSTOM_VALUE;
}

export function groupedCmsLinkTargetOptions(
  options: readonly CmsLinkTargetOption[],
): Array<{ group: CmsLinkTargetGroup; label: string; options: CmsLinkTargetOption[] }> {
  const order: CmsLinkTargetGroup[] = [
    "system",
    "page",
    "collection",
    "category",
    "product",
  ];
  return order
    .map((group) => ({
      group,
      label: CMS_LINK_TARGET_GROUP_LABELS[group],
      options: options.filter((o) => o.group === group),
    }))
    .filter((entry) => entry.options.length > 0);
}
