import type { Prisma } from "@/app/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export function primaryMustBeInSet(
  primaryId: string | null | undefined,
  ids: string[],
): string | null {
  if (!primaryId) return null;
  return ids.includes(primaryId) ? primaryId : null;
}

/** Ersetzt alle Kategorie-Zuordnungen eines Produkts (Primary max. eine). */
export async function replaceProductCategoryMemberships(
  tx: Tx,
  productId: string,
  categoryIds: string[],
  primaryCategoryId: string | null,
) {
  const primary = primaryMustBeInSet(primaryCategoryId, categoryIds);

  await tx.productCategory.deleteMany({ where: { productId } });
  if (categoryIds.length === 0) return;

  await tx.productCategory.createMany({
    data: categoryIds.map((categoryId) => ({
      productId,
      categoryId,
      isPrimary: primary === categoryId,
    })),
  });
}

/** Ersetzt Produktliste einer Kategorie; optional eine Primary-Zuordnung für ein Produkt. */
export async function replaceCategoryProductMemberships(
  tx: Tx,
  categoryId: string,
  productIds: string[],
  primaryProductId: string | null,
) {
  const primary = primaryMustBeInSet(primaryProductId, productIds);

  await tx.productCategory.deleteMany({ where: { categoryId } });

  if (primary) {
    await tx.productCategory.updateMany({
      where: { productId: primary, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  if (productIds.length === 0) return;

  await tx.productCategory.createMany({
    data: productIds.map((productId) => ({
      productId,
      categoryId,
      isPrimary: primary === productId,
    })),
  });
}
