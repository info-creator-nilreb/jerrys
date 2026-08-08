type Crumb = { href?: string; label: string };

export function truncateBreadcrumbLabel(title: string, max = 52): string {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
}

export function buildStorefrontProductBreadcrumbItems(options: {
  titleCrumb: string;
  primaryCategory: {
    slug: string;
    title: string;
    parent: { slug: string; title: string } | null;
  } | null;
}): Crumb[] {
  const { titleCrumb, primaryCategory } = options;
  if (primaryCategory) {
    const items: Crumb[] = [{ href: "/", label: "Start" }];
    if (primaryCategory.parent) {
      items.push({
        href: `/kategorien/${primaryCategory.parent.slug}`,
        label: primaryCategory.parent.title,
      });
    } else {
      items.push({ href: "/kategorien", label: "Kategorien" });
    }
    items.push({
      href: `/kategorien/${primaryCategory.slug}`,
      label: primaryCategory.title,
    });
    items.push({ label: titleCrumb });
    return items;
  }
  return [
    { href: "/", label: "Start" },
    { href: "/produkte", label: "Produkte" },
    { label: titleCrumb },
  ];
}
