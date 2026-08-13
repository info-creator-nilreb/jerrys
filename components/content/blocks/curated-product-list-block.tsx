import Link from "next/link";
import { ProductCard } from "@/components/storefront/product-card";
import type { CuratedProductListBlockData } from "@/lib/content/blocks/curated-product-list";
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
  let products: Awaited<ReturnType<typeof listActiveProductsForStorefront>> = [];
  try {
    if (data.source === "allActive") {
      products = await listActiveProductsForStorefront({
        take: Math.max(1, data.limit),
      });
    } else if (data.source === "collection" && data.collectionSlug) {
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
    kind: data.source === "collection" ? "collection" : "catalog",
    collectionSlug: data.collectionSlug,
  });
  const showAllLabel = resolveProductBlockShowAllLabel(data.showAllLabel);

  return (
    <section
      id="produkte"
      className="scroll-mt-20 bg-(--surface-soft) px-4 py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        {data.title ? (
          <h2 className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
            {data.title}
          </h2>
        ) : null}
        <div className="mt-10 grid w-full items-stretch justify-items-center gap-10 md:grid-cols-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex h-full min-h-0 w-full max-w-lg flex-1 flex-col self-stretch"
            >
              <ProductCard product={product} />
            </div>
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
      </div>
    </section>
  );
}
