import type { Prisma } from "@/app/generated/prisma/client";
import { defaultVariantSku } from "@/features/catalog/domain/default-variant-sku";

export type ProductVariantMirrorFields = {
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

/** Schreibt Preis/Bestand der Default-Variante aus Admin-Produktfeldern (Dual-Write Expand-Phase). */
export async function syncDefaultVariantFromProduct(
  tx: Prisma.TransactionClient,
  product: {
    id: string;
    productNumber: string | null;
  } & ProductVariantMirrorFields,
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

/** Spiegelt Default-Variante auf `products` (Listen/Storefront bis Contract-Phase). */
export async function mirrorProductFromDefaultVariant(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  const variant = await tx.productVariant.findFirst({
    where: { productId, isDefault: true },
  });
  if (!variant) return;

  await tx.product.update({
    where: { id: productId },
    data: {
      taxRatePercent: variant.taxRatePercent,
      priceGrossCents: variant.priceGrossCents,
      priceNetCents: variant.priceNetCents,
      listPriceGrossCents: variant.listPriceGrossCents,
      listPriceNetCents: variant.listPriceNetCents,
      lowestPrice30dGrossCents: variant.lowestPrice30dGrossCents,
      lowestPrice30dNetCents: variant.lowestPrice30dNetCents,
      stockQuantity: variant.stockQuantity,
      availableQuantity: variant.availableQuantity,
      deliveryTimeKey: variant.deliveryTimeKey,
      restockDays: variant.restockDays,
      minOrderQty: variant.minOrderQty,
      purchaseStep: variant.purchaseStep,
      maxOrderQty: variant.maxOrderQty,
    },
  });
}
