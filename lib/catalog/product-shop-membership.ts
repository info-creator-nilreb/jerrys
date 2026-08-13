import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import type { AdminShopAssignmentOption } from "@/lib/catalog/product-shop-assignment";
import { getPrisma } from "@/lib/db/prisma";

export type { AdminShopAssignmentOption } from "@/lib/catalog/product-shop-assignment";

type Tx = Prisma.TransactionClient;

/**
 * Stellt sicher, dass eine Kategorie mindestens eine Kollektion hat
 * (Shopify-Modell: Produkte nur über Kollektionen → Kategorien).
 */
export async function ensurePrimaryCollectionForCategory(
  tx: Tx,
  category: { id: string; slug: string; title: string },
): Promise<string> {
  const existing = await tx.categoryCollection.findFirst({
    where: { categoryId: category.id },
    orderBy: [{ sortOrder: "asc" }, { collection: { title: "asc" } }],
    select: { collectionId: true },
  });
  if (existing) return existing.collectionId;

  const slugBase = category.slug;
  let slug = slugBase;
  let n = 2;
  while (await tx.collection.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slugBase}-${n}`;
    n += 1;
  }

  const created = await tx.collection.create({
    data: {
      slug,
      title: category.title,
      description: `Automatische Kollektion für Kategorie „${category.title}“.`,
      isActive: true,
      sortOrder: 0,
    },
    select: { id: true },
  });

  await tx.categoryCollection.create({
    data: {
      categoryId: category.id,
      collectionId: created.id,
      sortOrder: 0,
    },
  });

  return created.id;
}

/**
 * Synchronisiert Produkt-Mitgliedschaften aus der Produktmaske:
 * - gewählte Kategorien → Primary-Kollektion der Kategorie
 * - zusätzliche Merchandising-Kollektionen (ohne Kategorie-Link)
 *
 * Schreibt nur `collection_products` (ADR 0010).
 */
export async function syncProductShopMemberships(
  tx: Tx,
  productId: string,
  input: {
    categoryIds: string[];
    extraCollectionIds: string[];
  },
): Promise<void> {
  const categoryIds = [...new Set(input.categoryIds.filter(Boolean))];
  const extraCollectionIds = [...new Set(input.extraCollectionIds.filter(Boolean))];

  const categories = await tx.category.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      collections: {
        orderBy: [{ sortOrder: "asc" }, { collection: { title: "asc" } }],
        take: 1,
        select: { collectionId: true },
      },
    },
  });

  const selectedCategorySet = new Set(categoryIds);
  const primaryCollectionByCategory = new Map<string, string>();

  for (const cat of categories) {
    const primary =
      cat.collections[0]?.collectionId ??
      (selectedCategorySet.has(cat.id)
        ? await ensurePrimaryCollectionForCategory(tx, cat)
        : null);
    if (primary) primaryCollectionByCategory.set(cat.id, primary);
  }

  const managedPrimaryIds = new Set(primaryCollectionByCategory.values());

  for (const [catId, collectionId] of primaryCollectionByCategory) {
    const shouldBelong = selectedCategorySet.has(catId);
    const existing = await tx.collectionProduct.findUnique({
      where: {
        collectionId_productId: { collectionId, productId },
      },
      select: { productId: true },
    });

    if (shouldBelong && !existing) {
      const maxSort = await tx.collectionProduct.aggregate({
        where: { collectionId },
        _max: { sortOrder: true },
      });
      await tx.collectionProduct.create({
        data: {
          collectionId,
          productId,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });
    } else if (!shouldBelong && existing) {
      await tx.collectionProduct.delete({
        where: {
          collectionId_productId: { collectionId, productId },
        },
      });
    }
  }

  const campaignCollections = await tx.collection.findMany({
    where: { categoryLinks: { none: {} } },
    select: { id: true },
  });
  const campaignIdSet = new Set(campaignCollections.map((c) => c.id));
  const desiredExtra = extraCollectionIds.filter((id) => campaignIdSet.has(id));

  const currentExtra = await tx.collectionProduct.findMany({
    where: {
      productId,
      collectionId: { in: [...campaignIdSet] },
    },
    select: { collectionId: true },
  });
  const currentExtraSet = new Set(currentExtra.map((m) => m.collectionId));
  const desiredExtraSet = new Set(desiredExtra);

  for (const collectionId of desiredExtraSet) {
    if (currentExtraSet.has(collectionId)) continue;
    if (managedPrimaryIds.has(collectionId)) continue;
    const maxSort = await tx.collectionProduct.aggregate({
      where: { collectionId },
      _max: { sortOrder: true },
    });
    await tx.collectionProduct.create({
      data: {
        collectionId,
        productId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  for (const collectionId of currentExtraSet) {
    if (desiredExtraSet.has(collectionId)) continue;
    await tx.collectionProduct.delete({
      where: {
        collectionId_productId: { collectionId, productId },
      },
    });
  }
}

/** Optionen für die Produktmaske (Kategorien + Merchandising-Kollektionen). */
export async function listShopAssignmentOptionsForAdmin(): Promise<AdminShopAssignmentOption> {
  const prisma = getPrisma();
  const [categories, campaignCollections] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        parent: { select: { title: true } },
        collections: {
          orderBy: [{ sortOrder: "asc" }, { collection: { title: "asc" } }],
          take: 1,
          select: { collectionId: true },
        },
      },
    }),
    prisma.collection.findMany({
      where: { categoryLinks: { none: {} } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true },
    }),
  ]);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      parentTitle: c.parent?.title ?? null,
      primaryCollectionId: c.collections[0]?.collectionId ?? null,
    })),
    campaignCollections,
  };
}
