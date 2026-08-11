import { ProductCard } from "@/components/storefront/product-card";
import type { ProductCategoryPickBlockData } from "@/lib/content/blocks/product-category-pick";
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
  let products: Awaited<ReturnType<typeof listActiveProductsByIdsForStorefront>> = [];
  try {
    products =
      data.mode === "category" && data.categorySlug
        ? await listActiveProductsByCategorySlugForStorefront(
            data.categorySlug,
            data.limit,
          )
        : await listActiveProductsByIdsForStorefront(data.productIds, data.limit);
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
