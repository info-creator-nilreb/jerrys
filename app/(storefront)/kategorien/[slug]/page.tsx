import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CollectionCatalogToolbar } from "@/components/storefront/collection-catalog-toolbar";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { listActiveProductsByCategorySlug } from "@/lib/catalog/category-queries";
import { categoryListingShouldNotFound, isPublishedCategoryListing } from "@/lib/catalog/category-storefront-visibility";
import {
  asCatalogProduct,
  catalogListingFiltersActive,
  catalogPriceBoundsEuros,
  filterProductsByPriceEuroRange,
  parseCatalogListingFilters,
} from "@/lib/catalog/collection-storefront-filters";
import {
  filterAndSortCollectionProducts,
  parseCollectionSort,
} from "@/lib/catalog/collection-storefront-sort";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import {
  buildStorefrontMetadata,
  catalogListingHasNonIndexParams,
  CATALOG_LISTING_NOINDEX_ROBOTS,
} from "@/lib/site/storefront-metadata";

export const dynamic = "force-dynamic";

function categoryListingBreadcrumbItems(category: {
  title: string;
  slug: string;
  parent: { slug: string; title: string } | null;
}) {
  const items: { href?: string; label: string }[] = [{ href: "/", label: "Start" }];
  if (category.parent) {
    items.push({
      href: `/kategorien/${category.parent.slug}`,
      label: category.parent.title,
    });
  }
  items.push({ label: category.title });
  return items;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; verfuegbar?: string; preis_min?: string; preis_max?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  try {
    const category = await listActiveProductsByCategorySlug(slug);
    if (!category || category.products.length === 0) {
      return { title: "Kategorie" };
    }
    return buildStorefrontMetadata({
      title: category.title,
      description: category.description ?? undefined,
      path: `/kategorien/${category.slug}`,
      ...(catalogListingHasNonIndexParams(sp)
        ? { robots: CATALOG_LISTING_NOINDEX_ROBOTS }
        : {}),
    });
  } catch {
    return { title: "Kategorie" };
  }
}

export default async function KategorieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sort?: string;
    verfuegbar?: string;
    preis_min?: string;
    preis_max?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = parseCollectionSort(sp.sort);
  const listingFilters = parseCatalogListingFilters(sp);

  let category: Awaited<ReturnType<typeof listActiveProductsByCategorySlug>> = null;
  let dbUnavailable = false;

  try {
    category = await listActiveProductsByCategorySlug(slug);
  } catch (e) {
    if (isDatabaseUnreachable(e)) dbUnavailable = true;
    else throw e;
  }

  if (dbUnavailable) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
        <DatabaseUnavailableNotice />
      </div>
    );
  }

  if (categoryListingShouldNotFound(category)) notFound();
  if (!isPublishedCategoryListing(category)) notFound();

  const allProducts = category.products.map(asCatalogProduct);
  const afterPrice = filterProductsByPriceEuroRange(
    allProducts,
    listingFilters.priceMinEuros,
    listingFilters.priceMaxEuros,
  );
  const products = filterAndSortCollectionProducts(afterPrice, {
    sort,
    onlyAvailable: listingFilters.onlyAvailable,
  });
  const filtersActive = catalogListingFiltersActive(listingFilters, sort);
  const priceBoundsEuros = catalogPriceBoundsEuros(allProducts);

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs items={categoryListingBreadcrumbItems(category)} />
      <h1 className="mt-6 text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
        {category.title}
      </h1>
      {category.description ? (
        <p className="mt-3 max-w-2xl text-base text-(--foreground-muted) md:text-lg">
          {category.description}
        </p>
      ) : null}

      <Suspense fallback={null}>
        <CollectionCatalogToolbar
          sort={sort}
          onlyAvailable={listingFilters.onlyAvailable}
          resultCount={products.length}
          priceMinEuros={listingFilters.priceMinEuros}
          priceMaxEuros={listingFilters.priceMaxEuros}
          priceBoundsEuros={priceBoundsEuros}
        />
      </Suspense>

      {filtersActive ? (
        <p className="mt-4 text-sm text-(--foreground-muted)">
          {listingFilters.onlyAvailable ? "Nur verfügbar · " : ""}
          {listingFilters.priceMinEuros != null || listingFilters.priceMaxEuros != null
            ? "Preisfilter · "
            : ""}
          {sort !== "default" ? "Sortiert · " : ""}
          <Link href={`/kategorien/${slug}`} className="font-medium text-primary hover:underline">
            Filter zurücksetzen
          </Link>
        </p>
      ) : null}

      {products.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Keine Produkte passen zu den Filtern.{" "}
          <Link href={`/kategorien/${slug}`} className="font-medium text-primary hover:underline">
            Filter zurücksetzen
          </Link>
        </p>
      ) : (
        <div className="mt-10 grid items-stretch gap-10 md:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="flex h-full min-h-0 w-full flex-1 flex-col self-stretch">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
