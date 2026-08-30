import { Suspense } from "react";
import {
  ProductPdpCrossSellFallback,
  ProductPdpCrossSellSection,
} from "@/components/storefront/product-pdp-cross-sell-section";

export function ProductPdpCrossSellBoundary({
  productId,
  collectionSlugs,
}: {
  productId: string;
  collectionSlugs: string[];
}) {
  return (
    <Suspense fallback={<ProductPdpCrossSellFallback />}>
      <ProductPdpCrossSellSection productId={productId} collectionSlugs={collectionSlugs} />
    </Suspense>
  );
}
