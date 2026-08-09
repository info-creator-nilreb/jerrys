import { getPrisma } from "@/lib/db/prisma";
import {
  WORKSHOP_CHECKOUT_PRODUCT_SKU,
  WORKSHOP_CHECKOUT_PRODUCT_SLUG,
} from "@/lib/workshop/workshop-checkout-catalog";

export type WorkshopCheckoutCatalogLine = {
  productId: string;
  productVariantId: string;
  sku: string;
  taxRatePercent: number;
};

/** Interner Katalogartikel für OrderLines (Preis kommt aus Termin-Snapshot). */
export async function getWorkshopCheckoutCatalogLine(): Promise<WorkshopCheckoutCatalogLine | null> {
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { slug: WORKSHOP_CHECKOUT_PRODUCT_SLUG },
    select: {
      id: true,
      variants: {
        where: { sku: WORKSHOP_CHECKOUT_PRODUCT_SKU, isActive: true },
        take: 1,
        select: { id: true, sku: true, taxRatePercent: true },
      },
    },
  });
  const variant = product?.variants[0];
  if (!product || !variant) return null;
  return {
    productId: product.id,
    productVariantId: variant.id,
    sku: variant.sku,
    taxRatePercent: variant.taxRatePercent,
  };
}
