import Link from "next/link";
import { Suspense } from "react";
import { CollectionCatalogToolbar } from "@/components/storefront/collection-catalog-toolbar";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import {
  filterAndSortCollectionProducts,
  parseCollectionSort,
} from "@/lib/catalog/collection-storefront-sort";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Produkte",
  description: "Design Katzenmöbel von jerry's – made in Germany.",
};

export default async function ProduktePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; verfuegbar?: string }>;
}) {
  const sp = await searchParams;
  const sort = parseCollectionSort(sp.sort);
  const onlyAvailable = sp.verfuegbar === "1";

  let products: Awaited<ReturnType<typeof listActiveProductsForStorefront>> = [];
  let hasPublishedCollections = false;
  let dbUnavailable = false;
  try {
    products = await listActiveProductsForStorefront();
  } catch (e) {
    if (isDatabaseUnreachable(e)) {
      dbUnavailable = true;
    } else {
      throw e;
    }
  }
  if (!dbUnavailable) {
    try {
      const collections = await listActiveCollectionsForStorefront();
      hasPublishedCollections = collections.length > 0;
    } catch (e) {
      if (!isDatabaseUnreachable(e)) throw e;
    }
  }

  const allProducts = products;
  const filteredProducts = filterAndSortCollectionProducts(allProducts, {
    sort,
    onlyAvailable,
  });
  const filtersActive = onlyAvailable || sort !== "default";

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: "Alle Produkte" }]} />
      <h1 className="mt-6 text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
        Produkte
      </h1>
      <p className="mt-2 max-w-2xl text-base text-(--foreground-muted) md:text-lg">
        Hochwertige Katzenmöbel – designed und gefertigt in Deutschland.
        {hasPublishedCollections ? (
          <>
            {" "}
            <Link href="/kollektionen" className="font-medium text-primary hover:underline">
              Kollektionen entdecken
            </Link>
          </>
        ) : null}
      </p>

      {dbUnavailable ? (
        <DatabaseUnavailableNotice />
      ) : allProducts.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Aktuell sind keine Produkte im Shop sichtbar. Bitte später erneut vorbeischauen.
        </p>
      ) : (
        <>
          <Suspense fallback={null}>
            <CollectionCatalogToolbar
              sort={sort}
              onlyAvailable={onlyAvailable}
              defaultSortLabel="Katalogreihenfolge"
            />
          </Suspense>

          {filtersActive ? (
            <p className="mt-4 text-sm text-(--foreground-muted)">
              {filteredProducts.length} von {allProducts.length} Produkten
              {onlyAvailable ? " · nur verfügbar" : ""}
              {sort !== "default" ? " · sortiert" : ""}
              {" · "}
              <Link href="/produkte" className="font-medium text-primary hover:underline">
                Filter zurücksetzen
              </Link>
            </p>
          ) : null}

          {filteredProducts.length === 0 ? (
            <p className="mt-10 text-(--foreground-muted)">
              Keine Produkte passen zu den Filtern.{" "}
              <Link href="/produkte" className="font-medium text-primary hover:underline">
                Filter zurücksetzen
              </Link>
            </p>
          ) : (
            <div className="mt-10 grid items-stretch gap-10 md:grid-cols-2">
              {filteredProducts.map((p) => (
                <div key={p.id} className="flex h-full min-h-0 w-full flex-1 flex-col self-stretch">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
