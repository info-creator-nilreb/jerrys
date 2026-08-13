import Link from "next/link";
import { ProductCard } from "@/components/storefront/product-card";
import type { ProductCategoryPickBlockData } from "@/lib/content/blocks/product-category-pick";
import {
  resolveProductBlockShowAllHref,
  resolveProductBlockShowAllLabel,
} from "@/lib/content/blocks/product-block-show-all";
import { listActiveProductsByCollectionSlugForStorefront } from "@/lib/catalog/collection-queries";
import {
  listActiveProductsByCategorySlugForStorefront,
  listActiveProductsByIdsForStorefront,
} from "@/lib/catalog/queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export async function ProductCategoryPickBlock({
  data,
}: {
  data: ProductCategoryPickBlockData;
  blockId: string;
}) {
  let products: Awaited<ReturnType<typeof listActiveProductsByIdsForStorefront>> =
    [];
  try {
    if (data.mode === "category" && data.categorySlug) {
      products = await listActiveProductsByCategorySlugForStorefront(
        data.categorySlug,
        data.limit,
      );
    } else if (data.mode === "collection" && data.collectionSlug) {
      products = await listActiveProductsByCollectionSlugForStorefront(
        data.collectionSlug,
        data.limit,
      );
    } else {
      products = await listActiveProductsByIdsForStorefront(
        data.productIds,
        data.limit,
      );
    }
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
    return null;
  }
  if (products.length === 0) return null;

  const showAllHref = resolveProductBlockShowAllHref({
    showAllCta: data.showAllCta,
    showAllHref: data.showAllHref,
    kind:
      data.mode === "collection"
        ? "collection"
        : data.mode === "category"
          ? "category"
          : "catalog",
    collectionSlug: data.collectionSlug,
    categorySlug: data.categorySlug,
  });
  const showAllLabel = resolveProductBlockShowAllLabel(data.showAllLabel);

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-16">
      {data.title ? (
        <h2 className="mb-10 text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
          {data.title}
        </h2>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {showAllHref ? (
        <div className="mt-10 flex justify-center">
          <Link
            href={showAllHref}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {showAllLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
