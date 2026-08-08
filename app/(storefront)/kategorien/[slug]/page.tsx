import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CollectionCatalogToolbar } from "@/components/storefront/collection-catalog-toolbar";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { listActiveProductsByCategorySlug } from "@/lib/catalog/category-queries";
import {
  filterAndSortCollectionProducts,
  parseCollectionSort,
} from "@/lib/catalog/collection-storefront-sort";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export const dynamic = "force-dynamic";

function categoryBreadcrumbItems(category: {
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
  } else {
    items.push({ href: "/kategorien", label: "Kategorien" });
  }
  items.push({ label: category.title });
  return items;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const category = await listActiveProductsByCategorySlug(slug);
    if (!category || category.products.length === 0) {
      return { title: "Kategorie" };
    }
    return {
      title: category.title,
      description: category.description ?? undefined,
      alternates: { canonical: `/kategorien/${category.slug}` },
    };
  } catch {
    return { title: "Kategorie" };
  }
}

export default async function KategorieDetailPage({
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

  if (!category || category.products.length === 0) notFound();

  const allProducts = category.products;
  const products = filterAndSortCollectionProducts(allProducts, { sort, onlyAvailable });
  const filtersActive = onlyAvailable || sort !== "default";

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <StorefrontBreadcrumbs items={categoryBreadcrumbItems(category)} />
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
          onlyAvailable={onlyAvailable}
          defaultSortLabel="Katalogreihenfolge"
        />
      </Suspense>

      {filtersActive ? (
        <p className="mt-4 text-sm text-(--foreground-muted)">
          {products.length} von {allProducts.length} Produkten
          {onlyAvailable ? " · nur verfügbar" : ""}
          {sort !== "default" ? " · sortiert" : ""}
          {" · "}
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
