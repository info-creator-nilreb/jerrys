import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("catalog.group-lifecycle");

export type CatalogGroupLifecycleResult = {
  ok: boolean;
  affectedIds: string[];
  skipped: { id: string; reason: string }[];
  message?: string;
};

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function setCategoriesActive(
  categoryIds: string[],
  isActive: boolean,
): Promise<CatalogGroupLifecycleResult> {
  const ids = uniqueIds(categoryIds);
  if (ids.length === 0) {
    return { ok: false, affectedIds: [], skipped: [], message: "Keine Kategorien ausgewählt." };
  }

  try {
    const existing = await getPrisma().category.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const found = new Set(existing.map((c) => c.id));
    const skipped = ids
      .filter((id) => !found.has(id))
      .map((id) => ({ id, reason: "Nicht gefunden." }));
    const toUpdate = ids.filter((id) => found.has(id));

    if (toUpdate.length > 0) {
      await getPrisma().category.updateMany({
        where: { id: { in: toUpdate } },
        data: { isActive },
      });
    }

    return {
      ok: true,
      affectedIds: toUpdate,
      skipped,
      message: isActive
        ? `${toUpdate.length} Kategorie(n) aktiviert.`
        : `${toUpdate.length} Kategorie(n) deaktiviert.`,
    };
  } catch (e) {
    log.error("set_categories_active_failed", errorMeta(e));
    return {
      ok: false,
      affectedIds: [],
      skipped: [],
      message: "Status konnte nicht geändert werden.",
    };
  }
}

/**
 * Hard-Delete. Unterkategorien blockieren (sonst würden Kinder per SetNull zu Roots).
 * Verknüpfte Kollektionen bleiben; nur `category_collections` fallen per Cascade weg.
 */
export async function deleteCategories(
  categoryIds: string[],
): Promise<CatalogGroupLifecycleResult> {
  const ids = uniqueIds(categoryIds);
  if (ids.length === 0) {
    return { ok: false, affectedIds: [], skipped: [], message: "Keine Kategorien ausgewählt." };
  }

  const affectedIds: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  try {
    for (const id of ids) {
      const category = await getPrisma().category.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          _count: { select: { children: true, collections: true } },
        },
      });
      if (!category) {
        skipped.push({ id, reason: "Nicht gefunden." });
        continue;
      }
      if (category._count.children > 0) {
        skipped.push({
          id,
          reason: `„${category.title}“: Hat Unterkategorien — zuerst Unterkategorien löschen oder verschieben.`,
        });
        continue;
      }
      await getPrisma().category.delete({ where: { id } });
      affectedIds.push(id);
    }

    return {
      ok: affectedIds.length > 0,
      affectedIds,
      skipped,
      message:
        affectedIds.length > 0
          ? `${affectedIds.length} Kategorie(n) gelöscht.` +
            (skipped.length > 0 ? ` ${skipped.length} übersprungen.` : "")
          : skipped.length > 0
            ? "Keine Kategorie gelöscht — siehe Hinweise."
            : "Nichts zu löschen.",
    };
  } catch (e) {
    log.error("delete_categories_failed", errorMeta(e));
    return {
      ok: false,
      affectedIds,
      skipped,
      message: "Löschen fehlgeschlagen.",
    };
  }
}

export async function setCollectionsActive(
  collectionIds: string[],
  isActive: boolean,
): Promise<CatalogGroupLifecycleResult> {
  const ids = uniqueIds(collectionIds);
  if (ids.length === 0) {
    return { ok: false, affectedIds: [], skipped: [], message: "Keine Kollektionen ausgewählt." };
  }

  try {
    const existing = await getPrisma().collection.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const found = new Set(existing.map((c) => c.id));
    const skipped = ids
      .filter((id) => !found.has(id))
      .map((id) => ({ id, reason: "Nicht gefunden." }));
    const toUpdate = ids.filter((id) => found.has(id));

    if (toUpdate.length > 0) {
      await getPrisma().collection.updateMany({
        where: { id: { in: toUpdate } },
        data: { isActive },
      });
    }

    return {
      ok: true,
      affectedIds: toUpdate,
      skipped,
      message: isActive
        ? `${toUpdate.length} Kollektion(en) aktiviert.`
        : `${toUpdate.length} Kollektion(en) deaktiviert.`,
    };
  } catch (e) {
    log.error("set_collections_active_failed", errorMeta(e));
    return {
      ok: false,
      affectedIds: [],
      skipped: [],
      message: "Status konnte nicht geändert werden.",
    };
  }
}

/**
 * Hard-Delete. Produkte bleiben; `collection_products` und Kategorie-Links fallen per Cascade weg.
 */
export async function deleteCollections(
  collectionIds: string[],
): Promise<CatalogGroupLifecycleResult> {
  const ids = uniqueIds(collectionIds);
  if (ids.length === 0) {
    return { ok: false, affectedIds: [], skipped: [], message: "Keine Kollektionen ausgewählt." };
  }

  const affectedIds: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  try {
    for (const id of ids) {
      const collection = await getPrisma().collection.findUnique({
        where: { id },
        select: { id: true, title: true },
      });
      if (!collection) {
        skipped.push({ id, reason: "Nicht gefunden." });
        continue;
      }
      await getPrisma().collection.delete({ where: { id } });
      affectedIds.push(id);
    }

    return {
      ok: affectedIds.length > 0,
      affectedIds,
      skipped,
      message:
        affectedIds.length > 0
          ? `${affectedIds.length} Kollektion(en) gelöscht.` +
            (skipped.length > 0 ? ` ${skipped.length} übersprungen.` : "")
          : skipped.length > 0
            ? "Keine Kollektion gelöscht — siehe Hinweise."
            : "Nichts zu löschen.",
    };
  } catch (e) {
    log.error("delete_collections_failed", errorMeta(e));
    return {
      ok: false,
      affectedIds,
      skipped,
      message: "Löschen fehlgeschlagen.",
    };
  }
}
