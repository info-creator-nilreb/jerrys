import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CollectionCatalogToolbar,
} from "@/components/storefront/collection-catalog-toolbar";
import { parseCollectionSort } from "@/lib/catalog/collection-storefront-sort";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { getActiveCollectionBySlugForStorefront } from "@/lib/catalog/collection-queries";
import { filterAndSortCollectionProducts } from "@/lib/catalog/collection-storefront-sort";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const col = await getActiveCollectionBySlugForStorefront(slug);
    if (!col) return { title: "Kollektion" };
    return {
      title: col.title,
      description: col.description ?? undefined,
    };
  } catch {
    return { title: "Kollektion" };
  }
}

export default async function KollektionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; verfuegbar?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = parseCollectionSort(sp.sort);
  const onlyAvailable = sp.verfuegbar === "1";

  let collection: Awaited<ReturnType<typeof getActiveCollectionBySlugForStorefront>> = null;
  let dbUnavailable = false;

  try {
    collection = await getActiveCollectionBySlugForStorefront(slug);
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

  if (!collection) notFound();

  const allProducts = collection.products.map((row) => row.product);
  const products = filterAndSortCollectionProducts(allProducts, { sort, onlyAvailable });
  const filtersActive = onlyAvailable || sort !== "default";

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs
        items={[{ href: "/", label: "Start" }, { label: collection.title }]}
      />
      <h1 className="mt-6 text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
        {collection.title}
      </h1>
      {collection.description ? (
        <p className="mt-3 max-w-2xl text-base text-(--foreground-muted) md:text-lg">
          {collection.description}
        </p>
      ) : null}

      {allProducts.length > 0 ? (
        <Suspense fallback={null}>
          <CollectionCatalogToolbar sort={sort} onlyAvailable={onlyAvailable} />
        </Suspense>
      ) : null}

      {filtersActive ? (
        <p className="mt-4 text-sm text-(--foreground-muted)">
          {products.length} von {allProducts.length} Produkten
          {onlyAvailable ? " · nur verfügbar" : ""}
          {sort !== "default" ? " · sortiert" : ""}
          {" · "}
          <Link href={`/kollektionen/${slug}`} className="font-medium text-primary hover:underline">
            Filter zurücksetzen
          </Link>
        </p>
      ) : null}

      {allProducts.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          In dieser Kollektion sind derzeit keine Produkte.{" "}
          <Link href="/produkte" className="font-medium text-primary hover:underline">
            Alle Produkte
          </Link>
        </p>
      ) : products.length === 0 ? (
        <p className="mt-10 text-(--foreground-muted)">
          Keine Produkte passen zu den Filtern.{" "}
          <Link href={`/kollektionen/${slug}`} className="font-medium text-primary hover:underline">
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
