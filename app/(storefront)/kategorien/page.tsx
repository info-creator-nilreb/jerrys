import Link from "next/link";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { listActiveCategoriesForStorefrontIndex } from "@/lib/catalog/category-queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kategorien",
  description: "Produkte nach Kategorie entdecken – jerry's Katzenmöbel.",
};

export default async function KategorienIndexPage() {
  let categories: Awaited<ReturnType<typeof listActiveCategoriesForStorefrontIndex>> = [];
  let dbUnavailable = false;
  try {
    categories = await listActiveCategoriesForStorefrontIndex();
  } catch (e) {
    if (isDatabaseUnreachable(e)) dbUnavailable = true;
    else throw e;
  }

  const rootCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: "Kategorien" }]} />
      <h1 className="mt-6 text-2xl font-semibold text-(--foreground-heading) md:text-3xl">Kategorien</h1>
      <p className="mt-2 max-w-2xl text-base text-(--foreground-muted) md:text-lg">
        Stöbern Sie nach Produkttyp und Einsatzbereich.
      </p>

      {dbUnavailable ? (
        <DatabaseUnavailableNotice />
      ) : categories.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Aktuell sind keine Kategorien mit Produkten veröffentlicht.{" "}
          <Link href="/produkte" className="font-medium text-primary hover:underline">
            Alle Produkte ansehen
          </Link>
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {rootCategories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/kategorien/${c.slug}`}
                className="block rounded-xl border border-(--surface-muted) bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <h2 className="text-xl font-semibold text-(--foreground-heading)">{c.title}</h2>
                {c.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-(--foreground-muted)">{c.description}</p>
                ) : null}
                <p className="mt-4 text-sm text-(--foreground-muted)">
                  {c.productCount} {c.productCount === 1 ? "Produkt" : "Produkte"}
                </p>
              </Link>
              {childCategories.some((ch) => ch.parentId === c.id) ? (
                <ul className="mt-3 space-y-2 border-l-2 border-(--surface-muted) pl-4">
                  {childCategories
                    .filter((ch) => ch.parentId === c.id)
                    .map((ch) => (
                      <li key={ch.id}>
                        <Link
                          href={`/kategorien/${ch.slug}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {ch.title}
                        </Link>
                        <span className="ml-2 text-xs text-(--foreground-muted)">
                          ({ch.productCount})
                        </span>
                      </li>
                    ))}
                </ul>
              ) : null}
            </li>
          ))}
          {childCategories
            .filter((ch) => !rootCategories.some((r) => r.id === ch.parentId))
            .map((c) => (
              <li key={c.id}>
                <Link
                  href={`/kategorien/${c.slug}`}
                  className="block rounded-xl border border-(--surface-muted) bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <h2 className="text-xl font-semibold text-(--foreground-heading)">{c.title}</h2>
                  {c.parent ? (
                    <p className="mt-1 text-xs text-(--foreground-muted)">Unter „{c.parent.title}“</p>
                  ) : null}
                  <p className="mt-4 text-sm text-(--foreground-muted)">
                    {c.productCount} {c.productCount === 1 ? "Produkt" : "Produkte"}
                  </p>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
