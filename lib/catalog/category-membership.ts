import type { Prisma } from "@/app/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Ersetzt die Kollektions-Zuordnung einer Kategorie (Sortierung = Listenreihenfolge). */
export async function replaceCategoryCollectionMemberships(
  tx: Tx,
  categoryId: string,
  collectionIds: string[],
) {
  await tx.categoryCollection.deleteMany({ where: { categoryId } });
  if (collectionIds.length === 0) return;

  await tx.categoryCollection.createMany({
    data: collectionIds.map((collectionId, index) => ({
      categoryId,
      collectionId,
      sortOrder: index,
    })),
  });
}

export type CategoryRefCandidate = {
  slug: string;
  title: string;
  sortOrder?: number;
  parentId?: string | null;
  parent?: { slug: string; title: string } | null;
};

/** Primary-Kategorie ableiten: Root vor Kind, dann niedrigste sortOrder, dann Titel. */
export function pickPrimaryCategoryRef<T extends CategoryRefCandidate>(
  categories: readonly T[],
): T | null {
  if (categories.length === 0) return null;
  const sorted = [...categories].sort((a, b) => {
    const aRoot = a.parentId == null ? 0 : 1;
    const bRoot = b.parentId == null ? 0 : 1;
    if (aRoot !== bRoot) return aRoot - bRoot;
    const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (so !== 0) return so;
    return a.title.localeCompare(b.title, "de");
  });
  return sorted[0] ?? null;
}

/** Dedupliziert Kategorien nach Slug (erste Wins). */
export function uniqueCategoriesBySlug<T extends { slug: string }>(
  categories: readonly T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of categories) {
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push(c);
  }
  return out;
}
