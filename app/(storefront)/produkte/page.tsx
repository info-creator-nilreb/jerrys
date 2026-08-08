import Link from "next/link";
import { Suspense } from "react";
import { CollectionCatalogToolbar } from "@/components/storefront/collection-catalog-toolbar";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { listActiveCategoriesForNav } from "@/lib/catalog/category-queries";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import {
  catalogListingFiltersActive,
  catalogPriceBoundsEuros,
  filterProductsByPriceEuroRange,
  filterProductsByPrimaryCategorySlug,
  mapProductWithPrimaryCategory,
  parseCatalogListingFilters,
} from "@/lib/catalog/collection-storefront-filters";
import {
  filterAndSortCollectionProducts,
  parseCollectionSort,
} from "@/lib/catalog/collection-storefront-sort";
import {
  filterProductsByStorefrontSearch,
  parseStorefrontSearchQuery,
} from "@/lib/catalog/storefront-product-search";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
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

function buildProdukteHref(opts: {
  q?: string | null;
  sort?: string;
  verfuegbar?: boolean;
  preis_min?: number | null;
  preis_max?: number | null;
  kategorie?: string | null;
}) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.sort && opts.sort !== "default") params.set("sort", opts.sort);
  if (opts.verfuegbar) params.set("verfuegbar", "1");
  if (opts.preis_min != null) params.set("preis_min", String(opts.preis_min));
  if (opts.preis_max != null) params.set("preis_max", String(opts.preis_max));
  if (opts.kategorie) params.set("kategorie", opts.kategorie);
  const qs = params.toString();
  return qs ? `/produkte?${qs}` : "/produkte";
}

export default async function ProduktePage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    verfuegbar?: string;
    q?: string;
    preis_min?: string;
    preis_max?: string;
    kategorie?: string;
  }>;
}) {
  const sp = await searchParams;
  const sort = parseCollectionSort(sp.sort);
  const listingFilters = parseCatalogListingFilters(sp);
  const searchQuery = parseStorefrontSearchQuery(sp.q);

  let products: Awaited<ReturnType<typeof listActiveProductsForStorefront>> = [];
  let categoryFacets: { slug: string; title: string }[] = [];
  let hasPublishedCollections = false;
  let dbUnavailable = false;
  try {
    products = await listActiveProductsForStorefront();
    const categories = await listActiveCategoriesForNav();
    categoryFacets = categories.map((c) => ({ slug: c.slug, title: c.title }));
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

  const catalogProducts = products.map(mapProductWithPrimaryCategory);
  const searchedProducts = filterProductsByStorefrontSearch(catalogProducts, searchQuery);
  const afterCategory = filterProductsByPrimaryCategorySlug(
    searchedProducts,
    listingFilters.categorySlug,
  );
  const afterPrice = filterProductsByPriceEuroRange(
    afterCategory,
    listingFilters.priceMinEuros,
    listingFilters.priceMaxEuros,
  );
  const filteredProducts = filterAndSortCollectionProducts(afterPrice, {
    sort,
    onlyAvailable: listingFilters.onlyAvailable,
  });
  const filtersActive = catalogListingFiltersActive(listingFilters, sort);
  const searchActive = searchQuery != null;
  const filterResetHref = buildProdukteHref({ q: searchQuery });
  const allResetHref = "/produkte";
  const selectedCategoryTitle =
    categoryFacets.find((c) => c.slug === listingFilters.categorySlug)?.title ?? null;
  const activeContext = [
    searchActive ? `Suche „${searchQuery}“` : null,
    listingFilters.onlyAvailable ? "nur verfügbar" : null,
    selectedCategoryTitle ? `Kategorie ${selectedCategoryTitle}` : null,
    listingFilters.priceMinEuros != null || listingFilters.priceMaxEuros != null
      ? "Preisfilter"
      : null,
    sort !== "default" ? "sortiert" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const priceBoundsEuros = catalogPriceBoundsEuros(catalogProducts);

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
            <CollectionCatalogToolbar
              sort={sort}
              onlyAvailable={listingFilters.onlyAvailable}
              resultCount={filteredProducts.length}
              priceMinEuros={listingFilters.priceMinEuros}
              priceMaxEuros={listingFilters.priceMaxEuros}
              priceBoundsEuros={priceBoundsEuros}
              categoryFacets={categoryFacets}
              selectedCategorySlug={listingFilters.categorySlug}
            />
          </Suspense>

          {searchActive || filtersActive ? (
            <p className="mt-4 text-sm text-(--foreground-muted)" role="status">
              {activeContext} ·{" "}
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
