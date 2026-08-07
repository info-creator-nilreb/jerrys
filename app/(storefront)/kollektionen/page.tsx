import Link from "next/link";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import { isStorefrontDatabaseDegraded } from "@/lib/db/is-database-unreachable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kollektionen",
  description: "Ausgewählte Produktgruppen von jerry's.",
};

export default async function KollektionenIndexPage() {
  let collections: Awaited<ReturnType<typeof listActiveCollectionsForStorefront>> = [];
  let dbUnavailable = false;
  try {
    collections = await listActiveCollectionsForStorefront();
  } catch (e) {
    if (isStorefrontDatabaseDegraded(e)) dbUnavailable = true;
    else throw e;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: "Kollektionen" }]} />
      <h1 className="mt-6 text-2xl font-semibold text-(--foreground-heading) md:text-3xl">Kollektionen</h1>
      <p className="mt-2 max-w-2xl text-base text-(--foreground-muted) md:text-lg">
        Kuratierte Auswahl unserer Katzenmöbel.
      </p>

      {dbUnavailable ? (
        <DatabaseUnavailableNotice />
      ) : collections.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Aktuell sind keine Kollektionen veröffentlicht.{" "}
          <Link href="/produkte" className="font-medium text-primary hover:underline">
            Alle Produkte ansehen
          </Link>
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                href={`/kollektionen/${c.slug}`}
                className="block rounded-xl border border-(--surface-muted) bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <h2 className="text-xl font-semibold text-(--foreground-heading)">{c.title}</h2>
                {c.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-(--foreground-muted)">{c.description}</p>
                ) : null}
                <p className="mt-4 text-sm text-(--foreground-muted)">
                  {c._count.products} {c._count.products === 1 ? "Produkt" : "Produkte"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
