import Link from "next/link";
import { ProductCarousel } from "@/components/storefront/product-carousel";
import type { ProductCategoryPickBlockData } from "@/lib/content/blocks/product-category-pick";
import {
  filterProductBlockProducts,
  productBlockFetchLimit,
} from "@/lib/content/blocks/product-block-filter";
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
  const showNotOrderable = data.showNotOrderable ?? true;
  const limit = Math.max(1, data.limit);
  const fetchLimit = productBlockFetchLimit(limit, showNotOrderable);

  let products: Awaited<ReturnType<typeof listActiveProductsByIdsForStorefront>> =
    [];
  try {
    if (data.mode === "category" && data.categorySlug) {
      products = await listActiveProductsByCategorySlugForStorefront(
        data.categorySlug,
        fetchLimit,
      );
    } else if (data.mode === "collection" && data.collectionSlug) {
      products = await listActiveProductsByCollectionSlugForStorefront(
        data.collectionSlug,
        fetchLimit,
      );
    } else {
      products = await listActiveProductsByIdsForStorefront(
        data.productIds,
        fetchLimit,
      );
    }
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
    return null;
  }

  products = filterProductBlockProducts(products, { showNotOrderable, limit });
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
      <ProductCarousel
        products={products}
        variant="compact"
        ariaLabel={data.title?.trim() || "Produkte"}
      />
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
