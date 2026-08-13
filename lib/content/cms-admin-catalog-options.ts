import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import { getPrisma } from "@/lib/db/prisma";

export type CmsAdminCollectionOption = {
  slug: string;
  title: string;
  productIds: string[];
};

/** Kollektionen inkl. Produkt-IDs für CMS-Editor und Live-Vorschau. */
export async function listCollectionsForCmsAdmin(): Promise<
  CmsAdminCollectionOption[]
> {
  const collections = await listActiveCollectionsForStorefront();
  if (collections.length === 0) return [];

  const memberships = await getPrisma().collectionProduct.findMany({
    where: {
      collectionId: { in: collections.map((c) => c.id) },
      product: { isActive: true },
    },
    orderBy: { sortOrder: "asc" },
    select: {
      collectionId: true,
      productId: true,
    },
  });

  const idsByCollection = new Map<string, string[]>();
  for (const row of memberships) {
    const list = idsByCollection.get(row.collectionId) ?? [];
    list.push(row.productId);
    idsByCollection.set(row.collectionId, list);
  }

  return collections.map((c) => ({
    slug: c.slug,
    title: c.title,
    productIds: idsByCollection.get(c.id) ?? [],
  }));
}
