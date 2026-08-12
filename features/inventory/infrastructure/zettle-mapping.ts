import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

export type ZettleMappingRow = {
  id: string;
  productVariantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string;
  stockQuantity: number;
  availableQuantity: number;
  zettleProductUuid: string | null;
  zettleVariantUuid: string | null;
  zettleProductName: string | null;
  zettleVariantName: string | null;
};

export async function listShopVariantsForZettleMapping(): Promise<ZettleMappingRow[]> {
  try {
    const variants = await getPrisma().productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      orderBy: [{ product: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        title: true,
        sku: true,
        stockQuantity: true,
        availableQuantity: true,
        product: { select: { title: true } },
        zettleMapping: {
          select: {
            id: true,
            zettleProductUuid: true,
            zettleVariantUuid: true,
            zettleProductName: true,
            zettleVariantName: true,
          },
        },
      },
      take: 500,
    });

    return variants.map((v) => ({
      id: v.zettleMapping?.id ?? v.id,
      productVariantId: v.id,
      productTitle: v.product.title,
      variantTitle: v.title,
      sku: v.sku,
      stockQuantity: v.stockQuantity,
      availableQuantity: v.availableQuantity,
      zettleProductUuid: v.zettleMapping?.zettleProductUuid ?? null,
      zettleVariantUuid: v.zettleMapping?.zettleVariantUuid ?? null,
      zettleProductName: v.zettleMapping?.zettleProductName ?? null,
      zettleVariantName: v.zettleMapping?.zettleVariantName ?? null,
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export async function upsertZettleProductMapping(input: {
  productVariantId: string;
  zettleProductUuid: string;
  zettleVariantUuid: string;
  zettleProductName?: string | null;
  zettleVariantName?: string | null;
}): Promise<void> {
  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.productVariantId },
    select: { id: true },
  });
  if (!variant) {
    throw new Error("Shop-Variante nicht gefunden.");
  }

  const existingOther = await prisma.zettleProductMapping.findUnique({
    where: {
      zettleProductUuid_zettleVariantUuid: {
        zettleProductUuid: input.zettleProductUuid,
        zettleVariantUuid: input.zettleVariantUuid,
      },
    },
  });
  if (existingOther && existingOther.productVariantId !== input.productVariantId) {
    throw new Error("Diese Zettle-Variante ist bereits einer anderen Shop-Variante zugeordnet.");
  }

  await prisma.zettleProductMapping.upsert({
    where: { productVariantId: input.productVariantId },
    create: {
      productVariantId: input.productVariantId,
      zettleProductUuid: input.zettleProductUuid,
      zettleVariantUuid: input.zettleVariantUuid,
      zettleProductName: input.zettleProductName?.slice(0, 200) ?? null,
      zettleVariantName: input.zettleVariantName?.slice(0, 200) ?? null,
    },
    update: {
      zettleProductUuid: input.zettleProductUuid,
      zettleVariantUuid: input.zettleVariantUuid,
      zettleProductName: input.zettleProductName?.slice(0, 200) ?? null,
      zettleVariantName: input.zettleVariantName?.slice(0, 200) ?? null,
    },
  });
}

export async function deleteZettleProductMapping(productVariantId: string): Promise<boolean> {
  const existing = await getPrisma().zettleProductMapping.findUnique({
    where: { productVariantId },
    select: { id: true },
  });
  if (!existing) return false;
  await getPrisma().zettleProductMapping.delete({ where: { productVariantId } });
  return true;
}

export async function getZettleMappingByVariantUuid(
  zettleVariantUuid: string,
): Promise<{ productId: string; productVariantId: string } | null> {
  const row = await getPrisma().zettleProductMapping.findFirst({
    where: { zettleVariantUuid },
    select: {
      productVariantId: true,
      productVariant: { select: { productId: true } },
    },
  });
  if (!row) return null;
  return {
    productVariantId: row.productVariantId,
    productId: row.productVariant.productId,
  };
}
