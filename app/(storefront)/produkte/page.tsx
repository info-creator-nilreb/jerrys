import Link from "next/link";
import { Suspense } from "react";
import { CollectionCatalogToolbar } from "@/components/storefront/collection-catalog-toolbar";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { StorefrontSearchForm } from "@/components/storefront/storefront-search-form";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import {
  filterAndSortCollectionProducts,
  parseCollectionSort,
} from "@/lib/catalog/collection-storefront-sort";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import {
  filterProductsByStorefrontSearch,
  parseStorefrontSearchQuery,
} from "@/lib/catalog/storefront-product-search";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = parseStorefrontSearchQuery(sp.q);
  if (q) {
    return {
      title: `Suche: ${q}`,
      description: `Suchergebnisse für „${q}“ im jerry's Shop.`,
    };
  }
  return {
    title: "Produkte",
    description: "Design Katzenmöbel von jerry's – made in Germany.",
  };
}

function buildProdukteHref(opts: { q?: string | null; sort?: string; verfuegbar?: boolean }) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.sort && opts.sort !== "default") params.set("sort", opts.sort);
  if (opts.verfuegbar) params.set("verfuegbar", "1");
  const qs = params.toString();
  return qs ? `/produkte?${qs}` : "/produkte";
}

export default async function ProduktePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; verfuegbar?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const sort = parseCollectionSort(sp.sort);
  const onlyAvailable = sp.verfuegbar === "1";
  const searchQuery = parseStorefrontSearchQuery(sp.q);
  const rawQ = sp.q?.trim() ?? "";

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

  const catalogProducts = products;
  const searchedProducts = filterProductsByStorefrontSearch(catalogProducts, searchQuery);
  const filteredProducts = filterAndSortCollectionProducts(searchedProducts, {
    sort,
    onlyAvailable,
  });
  const filtersActive = onlyAvailable || sort !== "default";
  const searchActive = searchQuery != null;
  const filterResetHref = buildProdukteHref({ q: searchQuery });
  const allResetHref = "/produkte";

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: "Alle Produkte" }]} />
      <h1 className="mt-6 text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
        {searchActive ? `Suche: ${searchQuery}` : "Produkte"}
      </h1>
      <p className="mt-2 max-w-2xl text-base text-(--foreground-muted) md:text-lg">
        {searchActive ? (
          <>Ergebnisse für „{searchQuery}“ im Katalog.</>
        ) : (
          <>
            Hochwertige Katzenmöbel – designed und gefertigt in Deutschland.
            {hasPublishedCollections ? (
              <>
                {" "}
                <Link href="/kollektionen" className="font-medium text-primary hover:underline">
                  Kollektionen entdecken
                </Link>
              </>
            ) : null}
          </>
        )}
      </p>

      {dbUnavailable ? (
        <DatabaseUnavailableNotice />
      ) : catalogProducts.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Aktuell sind keine Produkte im Shop sichtbar. Bitte später erneut vorbeischauen.
        </p>
      ) : (
        <>
          <Suspense fallback={null}>
            <StorefrontSearchForm
              query={searchQuery ?? rawQ}
              preserveParams={{
                sort: sort !== "default" ? sort : undefined,
                verfuegbar: onlyAvailable ? "1" : undefined,
              }}
            />
          </Suspense>

          <Suspense fallback={null}>
            <CollectionCatalogToolbar
              sort={sort}
              onlyAvailable={onlyAvailable}
              defaultSortLabel="Katalogreihenfolge"
            />
          </Suspense>

          {searchActive || filtersActive ? (
            <p className="mt-4 text-sm text-(--foreground-muted)" role="status">
              {filteredProducts.length} von {searchedProducts.length} Produkten
              {searchActive ? ` · Suche „${searchQuery}“` : ""}
              {onlyAvailable ? " · nur verfügbar" : ""}
              {sort !== "default" ? " · sortiert" : ""}
              {" · "}
              {filtersActive ? (
                <Link href={filterResetHref} className="font-medium text-primary hover:underline">
                  Filter zurücksetzen
                </Link>
              ) : null}
              {filtersActive && searchActive ? " · " : null}
              {searchActive ? (
                <Link href={allResetHref} className="font-medium text-primary hover:underline">
                  Suche zurücksetzen
                </Link>
              ) : null}
            </p>
          ) : null}

          {searchActive && searchedProducts.length === 0 ? (
            <p className="mt-10 text-(--foreground-muted)" role="status">
              Keine Treffer für „{searchQuery}“.{" "}
              <Link href={allResetHref} className="font-medium text-primary hover:underline">
                Alle Produkte anzeigen
              </Link>
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="mt-10 text-(--foreground-muted)" role="status">
              Keine Produkte passen zu den Filtern.{" "}
              <Link href={filterResetHref} className="font-medium text-primary hover:underline">
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
