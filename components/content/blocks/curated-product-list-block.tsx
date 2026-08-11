import { ProductCard } from "@/components/storefront/product-card";
import type { CuratedProductListBlockData } from "@/lib/content/blocks/curated-product-list";
import { listActiveProductsByIdsForStorefront } from "@/lib/catalog/queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export async function CuratedProductListBlock({
  data,
}: {
  data: CuratedProductListBlockData;
  blockId: string;
}) {
  let products: Awaited<ReturnType<typeof listActiveProductsByIdsForStorefront>> = [];
  try {
    products = await listActiveProductsByIdsForStorefront(data.productIds, data.limit);
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
    return null;
  }
  if (products.length === 0) return null;

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
    </section>
  );
}
