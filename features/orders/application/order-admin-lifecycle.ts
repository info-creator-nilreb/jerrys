import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("orders.admin-lifecycle");

const SHOPIFY_IMPORT_KEY_PREFIX = "shopify-order:";

const BLOCKING_PAYMENT_STATUSES = ["succeeded", "partially_refunded", "processing"] as const;

export type OrderLifecycleResult = {
  ok: boolean;
  affectedIds: string[];
  skipped: { id: string; reason: string }[];
  message?: string;
};

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

type OrderDeleteSnapshot = {
  id: string;
  orderNumber: string;
  idempotencyKey: string | null;
  invoiceNumber: string | null;
  payments: { status: string }[];
};

export function shopifyImportIdempotencyKey(idempotencyKey: string | null | undefined): boolean {
  return Boolean(idempotencyKey?.startsWith(SHOPIFY_IMPORT_KEY_PREFIX));
}

/** Prüft, ob eine Bestellung im Admin gelöscht werden darf (nur Import-Aufräumen). */
export function orderAdminDeleteBlocker(order: OrderDeleteSnapshot): string | null {
  if (!shopifyImportIdempotencyKey(order.idempotencyKey)) {
    return "Nur Shopify-Import-Bestellungen sind löschbar. Echte Shop-Bestellungen bleiben aus buchhalterischen Gründen erhalten.";
  }
  if (order.invoiceNumber) {
    return "Rechnung ausgestellt — Aufbewahrungspflicht, nicht löschbar.";
  }
  if (order.payments.some((p) => BLOCKING_PAYMENT_STATUSES.includes(p.status as (typeof BLOCKING_PAYMENT_STATUSES)[number]))) {
    return "Zahlung erfasst — nicht löschbar.";
  }
  return null;
}

export async function deleteOrders(orderIds: string[]): Promise<OrderLifecycleResult> {
  const ids = uniqueIds(orderIds);
  if (ids.length === 0) {
    return { ok: false, affectedIds: [], skipped: [], message: "Keine Bestellungen ausgewählt." };
  }

  try {
    const prisma = getPrisma();
    const existing = await prisma.order.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        orderNumber: true,
        idempotencyKey: true,
        invoiceNumber: true,
        payments: { select: { status: true } },
      },
    });

    const found = new Map(existing.map((o) => [o.id, o]));
    const skipped: { id: string; reason: string }[] = [];
    const toDelete: string[] = [];

    for (const id of ids) {
      const order = found.get(id);
      if (!order) {
        skipped.push({ id, reason: "Nicht gefunden." });
        continue;
      }
      const blocker = orderAdminDeleteBlocker(order);
      if (blocker) {
        skipped.push({ id, reason: `${order.orderNumber}: ${blocker}` });
        continue;
      }
      toDelete.push(id);
    }

    if (toDelete.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: toDelete } } });
    }

    return {
      ok: toDelete.length > 0 || skipped.length === 0,
      affectedIds: toDelete,
      skipped,
      message:
        toDelete.length > 0
          ? `${toDelete.length} Bestellung(en) gelöscht.`
          : skipped.length > 0
            ? "Keine Bestellung gelöscht."
            : "Nichts zu löschen.",
    };
  } catch (e) {
    log.error("delete_orders_failed", errorMeta(e));
    return {
      ok: false,
      affectedIds: [],
      skipped: [],
      message: "Löschen fehlgeschlagen.",
    };
  }
}
