import { ProductCard } from "@/components/storefront/product-card";
import type { CuratedProductListBlockData } from "@/lib/content/blocks/curated-product-list";
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
      const all = await listActiveProductsForStorefront();
      products = all.slice(0, Math.max(1, data.limit));
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
      </div>
    </section>
  );
}
