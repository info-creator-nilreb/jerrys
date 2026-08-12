import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("catalog.product-lifecycle");

export type ProductLifecycleResult = {
  ok: boolean;
  affectedIds: string[];
  skipped: { id: string; reason: string }[];
  message?: string;
};

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function blockersForProduct(productId: string): Promise<string | null> {
  const prisma = getPrisma();
  const [orderItems, reservations, movements] = await Promise.all([
    prisma.orderItem.count({ where: { productId } }),
    prisma.stockReservation.count({ where: { productId } }),
    prisma.stockMovement.count({ where: { productId } }),
  ]);
  if (orderItems > 0) {
    return "Hat Bestellpositionen — bitte deaktivieren statt löschen.";
  }
  if (reservations > 0) {
    return "Hat Bestandsreservierungen — bitte deaktivieren statt löschen.";
  }
  if (movements > 0) {
    return "Hat Lagerbewegungen — bitte deaktivieren statt löschen.";
  }
  return null;
}

/**
 * Aktiviert/deaktiviert Produkte und spiegelt den Status auf alle Varianten.
 */
export async function setProductsActive(
  productIds: string[],
  isActive: boolean,
): Promise<ProductLifecycleResult> {
  const ids = uniqueIds(productIds);
  if (ids.length === 0) {
    return { ok: false, affectedIds: [], skipped: [], message: "Keine Produkte ausgewählt." };
  }

  try {
    const existing = await getPrisma().product.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const found = new Set(existing.map((p) => p.id));
    const skipped = ids
      .filter((id) => !found.has(id))
      .map((id) => ({ id, reason: "Nicht gefunden." }));
    const toUpdate = ids.filter((id) => found.has(id));

    if (toUpdate.length > 0) {
      await getPrisma().$transaction(async (tx) => {
        await tx.product.updateMany({
          where: { id: { in: toUpdate } },
          data: { isActive },
        });
        await tx.productVariant.updateMany({
          where: { productId: { in: toUpdate } },
          data: { isActive },
        });
      });
    }

    return {
      ok: true,
      affectedIds: toUpdate,
      skipped,
      message: isActive
        ? `${toUpdate.length} Produkt(e) aktiviert.`
        : `${toUpdate.length} Produkt(e) deaktiviert.`,
    };
  } catch (e) {
    log.error("set_products_active_failed", errorMeta(e));
    return {
      ok: false,
      affectedIds: [],
      skipped: [],
      message: "Status konnte nicht geändert werden.",
    };
  }
}

/**
 * Löscht Produkte hart, sofern keine Bestellungen/Reservierungen/Lagerbewegungen existieren.
 */
export async function deleteProducts(productIds: string[]): Promise<ProductLifecycleResult> {
  const ids = uniqueIds(productIds);
  if (ids.length === 0) {
    return { ok: false, affectedIds: [], skipped: [], message: "Keine Produkte ausgewählt." };
  }

  const affectedIds: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  try {
    for (const id of ids) {
      const product = await getPrisma().product.findUnique({
        where: { id },
        select: { id: true, title: true },
      });
      if (!product) {
        skipped.push({ id, reason: "Nicht gefunden." });
        continue;
      }
      const blocker = await blockersForProduct(id);
      if (blocker) {
        skipped.push({ id, reason: `„${product.title}“: ${blocker}` });
        continue;
      }
      await getPrisma().product.delete({ where: { id } });
      affectedIds.push(id);
    }

    const ok = affectedIds.length > 0;
    return {
      ok,
      affectedIds,
      skipped,
      message:
        affectedIds.length > 0
          ? `${affectedIds.length} Produkt(e) gelöscht.` +
            (skipped.length > 0 ? ` ${skipped.length} übersprungen.` : "")
          : skipped.length > 0
            ? "Kein Produkt gelöscht — siehe Hinweise."
            : "Nichts zu löschen.",
    };
  } catch (e) {
    log.error("delete_products_failed", errorMeta(e));
    return {
      ok: false,
      affectedIds,
      skipped,
      message: "Löschen fehlgeschlagen.",
    };
  }
}
