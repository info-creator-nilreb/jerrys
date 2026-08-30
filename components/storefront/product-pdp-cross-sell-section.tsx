import { listRelatedProductsForPdp } from "@/lib/catalog/queries";
import { ProductPdpCrossSell } from "@/components/storefront/product-pdp-cross-sell";

export async function ProductPdpCrossSellSection({
  productId,
  collectionSlugs,
}: {
  productId: string;
  collectionSlugs: string[];
}) {
  const relatedProducts = await listRelatedProductsForPdp(productId, collectionSlugs, 4);
  return <ProductPdpCrossSell products={relatedProducts} />;
}

export function ProductPdpCrossSellFallback() {
  return (
    <section
      className="mt-8 border-t border-(--surface-muted) pt-8"
      aria-busy="true"
      aria-label="Empfehlungen werden geladen"
    >
      <div className="h-3 w-40 rounded bg-(--surface-muted) motion-safe:animate-pulse motion-reduce:animate-none" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-(--surface-muted) bg-white"
            aria-hidden
          >
            <div className="aspect-square bg-(--surface-muted) motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="space-y-2 p-2.5">
              <div className="h-3 w-full rounded bg-(--surface-muted) motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-16 rounded bg-(--surface-muted) motion-safe:animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
