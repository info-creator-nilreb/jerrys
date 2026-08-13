import { randomUUID } from "crypto";
import { syncDefaultVariantFromProduct } from "@/features/catalog/server";
import { getPrisma } from "@/lib/db/prisma";

/**
 * Legt ein inaktives Entwurfsprodukt an, damit die volle Bearbeiten-UI
 * (Medien-Upload, KI, Varianten) sofort verfügbar ist.
 */
export async function createProductDraft(): Promise<{ id: string }> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
  const slug = `entwurf-${suffix}`;
  const sku = `DRAFT-${suffix.toUpperCase()}`;

  const created = await getPrisma().$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        title: "Neues Produkt",
        slug,
        isActive: false,
        description: null,
        featureBullets: [],
        attributes: [],
      },
      select: { id: true },
    });

    await syncDefaultVariantFromProduct(tx, {
      id: product.id,
      productNumber: null,
      sku,
      taxRatePercent: 19,
      priceGrossCents: 0,
      priceNetCents: 0,
      listPriceGrossCents: null,
      listPriceNetCents: null,
      lowestPrice30dGrossCents: null,
      lowestPrice30dNetCents: null,
      stockQuantity: 0,
      availableQuantity: 0,
      deliveryTimeKey: "2-4-werktage",
      restockDays: null,
      minOrderQty: 1,
      purchaseStep: 1,
      maxOrderQty: null,
      isActive: false,
    });

    return product;
  });

  return { id: created.id };
}
