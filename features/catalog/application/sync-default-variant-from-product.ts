import type { Prisma } from "@/app/generated/prisma/client";
import { defaultVariantSku } from "@/features/catalog/domain/default-variant-sku";

export type DefaultVariantCommerceFields = {
  taxRatePercent: number;
  priceGrossCents: number;
  priceNetCents: number;
  listPriceGrossCents: number | null;
  listPriceNetCents: number | null;
  lowestPrice30dGrossCents: number | null;
  lowestPrice30dNetCents: number | null;
  stockQuantity: number;
  availableQuantity: number;
  deliveryTimeKey: string | null;
  restockDays: number | null;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
  isActive: boolean;
};

/** @deprecated Alias */
export type ProductVariantMirrorFields = DefaultVariantCommerceFields;

/** Schreibt Preis/Bestand der Default-Variante (autoritative Commerce-Daten, Contract-Phase). */
export async function syncDefaultVariantFromProduct(
  tx: Prisma.TransactionClient,
  product: {
    id: string;
    productNumber: string | null;
    /** Wenn gesetzt, überschreibt die Default-Varianten-SKU (Admin-bearbeitbar). */
    sku?: string | null;
  } & DefaultVariantCommerceFields,
): Promise<void> {
  const sku = defaultVariantSku(product);
  const data = {
    sku,
    taxRatePercent: product.taxRatePercent,
    priceGrossCents: product.priceGrossCents,
    priceNetCents: product.priceNetCents,
    listPriceGrossCents: product.listPriceGrossCents,
    listPriceNetCents: product.listPriceNetCents,
    lowestPrice30dGrossCents: product.lowestPrice30dGrossCents,
    lowestPrice30dNetCents: product.lowestPrice30dNetCents,
    stockQuantity: product.stockQuantity,
    availableQuantity: product.availableQuantity,
    deliveryTimeKey: product.deliveryTimeKey,
    restockDays: product.restockDays,
    minOrderQty: product.minOrderQty,
    purchaseStep: product.purchaseStep,
    maxOrderQty: product.maxOrderQty,
    isActive: product.isActive,
    isDefault: true,
  };

  const existing = await tx.productVariant.findFirst({
    where: { productId: product.id, isDefault: true },
    select: { id: true },
  });

  if (existing) {
    await tx.productVariant.update({
      where: { id: existing.id },
      data,
    });
    return;
  }

  await tx.productVariant.create({
    data: {
      productId: product.id,
      ...data,
    },
  });
}
