/**
 * Client-sichere Typen/Helper für die Produkt-Shop-Zuordnung.
 * Keine Prisma-/Node-Imports — darf in Client Components landen.
 */

export type AdminShopAssignmentOption = {
  categories: Array<{
    id: string;
    title: string;
    slug: string;
    parentTitle: string | null;
    primaryCollectionId: string | null;
  }>;
  campaignCollections: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
};

/** Aktuelle Kategorie-/Extra-Auswahl eines Produkts für die Edit-Maske. */
export function resolveSelectedShopAssignment(input: {
  membershipCollectionIds: string[];
  options: AdminShopAssignmentOption;
}): { categoryIds: string[]; extraCollectionIds: string[] } {
  const memberSet = new Set(input.membershipCollectionIds);
  const categoryIds = input.options.categories
    .filter((c) => c.primaryCollectionId && memberSet.has(c.primaryCollectionId))
    .map((c) => c.id);
  const extraCollectionIds = input.options.campaignCollections
    .filter((c) => memberSet.has(c.id))
    .map((c) => c.id);
  return { categoryIds, extraCollectionIds };
}
