import { ProductCarousel } from "@/components/storefront/product-carousel";
import { ProductBlockShowAllLink } from "@/components/storefront/product-block-show-all-link";
import type { CuratedProductListBlockData } from "@/lib/content/blocks/curated-product-list";
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
  listActiveProductsByIdsForStorefront,
  listActiveProductsForStorefront,
} from "@/lib/catalog/queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export async function CuratedProductListBlock({
  data,
}: {
  data: CuratedProductListBlockData;
  blockId: string;
}) {
  const showNotOrderable = data.showNotOrderable ?? true;
  const limit = Math.max(1, data.limit);
  const fetchLimit = productBlockFetchLimit(limit, showNotOrderable);

  let products: Awaited<ReturnType<typeof listActiveProductsForStorefront>> = [];
  try {
    if (data.source === "allActive") {
      products = await listActiveProductsForStorefront();
    } else if (data.source === "collection" && data.collectionSlug) {
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
    kind: data.source === "collection" ? "collection" : "catalog",
    collectionSlug: data.collectionSlug,
  });
  const showAllLabel = resolveProductBlockShowAllLabel(data.showAllLabel);

  return (
    <section
      id="produkte"
      className="scroll-mt-20 bg-(--surface-soft) px-4 py-12 md:py-16"
    >
      <div className="mx-auto max-w-6xl">
        {data.title ? (
          <h2 className="text-center text-xl font-semibold text-(--foreground-heading) md:text-2xl">
            {data.title}
          </h2>
        ) : null}
        <ProductCarousel
          products={products}
          variant="featured"
          ariaLabel={data.title?.trim() || "Kuratierte Produkte"}
          className="mt-6 w-full"
        />
        {showAllHref ? (
          <ProductBlockShowAllLink
            href={showAllHref}
            label={showAllLabel}
            className="mt-8 md:flex md:justify-center"
          />
        ) : null}
      </div>
    </section>
  );
}
