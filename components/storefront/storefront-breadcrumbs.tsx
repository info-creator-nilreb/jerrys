import Link from "next/link";

export type StorefrontBreadcrumbItem = {
  label: string;
  /** Ohne href = aktuelle Seite (kein Link) */
  href?: string;
};

/**
 * Einheitliche Brotkrümel-Navigation für Storefront-Unterseiten (Start → …).
 */
export function StorefrontBreadcrumbs({ items }: { items: StorefrontBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Brotkrümel" className="text-sm text-(--foreground-muted)">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-x-2">
            {i > 0 ? (
              <span className="text-(--surface-muted) select-none" aria-hidden>
                /
              </span>
            ) : null}
            {item.href ? (
              <Link href={item.href} className="text-primary underline-offset-4 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-(--foreground-heading)" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
