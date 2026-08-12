import "server-only";

import { applyPosRefundStockMovements, applyPosSaleStockMovements } from "@/features/inventory/application/apply-pos-stock-movements";
import {
  createZettleClientFromConnection,
  type ZettlePurchase,
} from "@/features/inventory/infrastructure/zettle-client";
import {
  markZettleConnectionError,
  markZettlePurchaseSyncCompleted,
} from "@/features/inventory/infrastructure/zettle-connection";
import { getZettleMappingByVariantUuid } from "@/features/inventory/infrastructure/zettle-mapping";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

export type SyncZettlePurchasesResult = {
  fetched: number;
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function purchaseUuidOf(p: ZettlePurchase): string | null {
  const id = (p.purchaseUUID1 || p.purchaseUUID || "").trim();
  return id || null;
}

function parseQuantity(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return n;
}

function purchasedAtOf(p: ZettlePurchase): Date | null {
  const raw = p.timestamp || p.created;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Zieht aktuelle Zettle-Käufe und bucht gemappte Varianten idempotent ab.
 * Unmapped Zeilen → skipped; Unterbestand → failed (kein Negativbestand).
 */
export async function syncZettlePurchases(options?: {
  lookbackDays?: number;
  limit?: number;
}): Promise<SyncZettlePurchasesResult> {
  const client = await createZettleClientFromConnection();
  if (!client) {
    throw new Error("Zettle ist nicht verbunden.");
  }

  const lookbackDays = options?.lookbackDays ?? 7;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - lookbackDays);
  const startDate = start.toISOString().slice(0, 19);

  const { purchases } = await client.listPurchases({
    startDate,
    limit: options?.limit ?? 50,
    descending: true,
  });

  const result: SyncZettlePurchasesResult = {
    fetched: purchases.length,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const prisma = getPrisma();

  for (const purchase of purchases) {
    const purchaseUuid = purchaseUuidOf(purchase);
    if (!purchaseUuid) {
      result.skipped += 1;
      continue;
    }

    const existing = await prisma.zettlePurchaseSync.findUnique({
      where: { purchaseUuid },
    });
    if (existing?.status === "processed" || existing?.status === "skipped") {
      result.skipped += 1;
      continue;
    }

    const isRefund = Boolean(purchase.refund);
    const linesRaw = purchase.products ?? [];
    const mappedLines: Array<{
      productId: string;
      productVariantId: string;
      quantity: number;
    }> = [];
    let hasUnmapped = false;
    let unmappedDetail = "";

    for (const line of linesRaw) {
      const qtyAbs = Math.abs(parseQuantity(line.quantity));
      if (qtyAbs <= 0) continue;
      // Ganzzahlige Mengen (Boutique-Stückware); Dezimal → skip mit Hinweis
      if (!Number.isInteger(qtyAbs)) {
        hasUnmapped = true;
        unmappedDetail = `Nicht-ganzzahlige Menge (${line.quantity}) — bitte manuell prüfen.`;
        continue;
      }
      if (!line.variantUuid) {
        // Custom amounts / non-library items
        continue;
      }
      const mapping = await getZettleMappingByVariantUuid(line.variantUuid);
      if (!mapping) {
        hasUnmapped = true;
        unmappedDetail = `Kein Mapping für Zettle-Variante ${line.variantUuid}${line.name ? ` (${line.name})` : ""}.`;
        continue;
      }
      mappedLines.push({
        productId: mapping.productId,
        productVariantId: mapping.productVariantId,
        quantity: qtyAbs,
      });
    }

    if (mappedLines.length === 0) {
      await prisma.zettlePurchaseSync.upsert({
        where: { purchaseUuid },
        create: {
          purchaseUuid,
          purchaseNumber: purchase.purchaseNumber ?? null,
          purchasedAt: purchasedAtOf(purchase),
          status: hasUnmapped ? "failed" : "skipped",
          isRefund,
          lastError: hasUnmapped
            ? unmappedDetail || "Keine gemappten Positionen."
            : "Keine lagerrelevanten Positionen.",
          processedAt: new Date(),
        },
        update: {
          status: hasUnmapped ? "failed" : "skipped",
          lastError: hasUnmapped
            ? unmappedDetail || "Keine gemappten Positionen."
            : "Keine lagerrelevanten Positionen.",
          processedAt: new Date(),
          isRefund,
        },
      });
      if (hasUnmapped) {
        result.failed += 1;
        result.errors.push(`${purchaseUuid}: ${unmappedDetail}`);
      } else {
        result.skipped += 1;
      }
      continue;
    }

    if (hasUnmapped) {
      // Teilweise gemappt: lieber failen als still halb buchen
      await prisma.zettlePurchaseSync.upsert({
        where: { purchaseUuid },
        create: {
          purchaseUuid,
          purchaseNumber: purchase.purchaseNumber ?? null,
          purchasedAt: purchasedAtOf(purchase),
          status: "failed",
          isRefund,
          lastError: `Teilweise ungemappt: ${unmappedDetail}`,
        },
        update: {
          status: "failed",
          lastError: `Teilweise ungemappt: ${unmappedDetail}`,
          isRefund,
        },
      });
      result.failed += 1;
      result.errors.push(`${purchaseUuid}: teilweise ungemappt`);
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Double-check inside tx for races
        const again = await tx.zettlePurchaseSync.findUnique({
          where: { purchaseUuid },
        });
        if (again?.status === "processed") {
          return;
        }

        const correlationId = `zettle:${purchaseUuid}`;
        if (isRefund) {
          await applyPosRefundStockMovements(tx, {
            lines: mappedLines,
            correlationId,
          });
        } else {
          await applyPosSaleStockMovements(tx, {
            lines: mappedLines,
            correlationId,
          });
        }

        await tx.zettlePurchaseSync.upsert({
          where: { purchaseUuid },
          create: {
            purchaseUuid,
            purchaseNumber: purchase.purchaseNumber ?? null,
            purchasedAt: purchasedAtOf(purchase),
            status: "processed",
            isRefund,
            lastError: null,
            processedAt: new Date(),
          },
          update: {
            status: "processed",
            lastError: null,
            processedAt: new Date(),
            isRefund,
          },
        });
      });
      result.processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync fehlgeschlagen.";
      await prisma.zettlePurchaseSync.upsert({
        where: { purchaseUuid },
        create: {
          purchaseUuid,
          purchaseNumber: purchase.purchaseNumber ?? null,
          purchasedAt: purchasedAtOf(purchase),
          status: "failed",
          isRefund,
          lastError: msg.slice(0, 500),
        },
        update: {
          status: "failed",
          lastError: msg.slice(0, 500),
          isRefund,
        },
      });
      result.failed += 1;
      result.errors.push(`${purchaseUuid}: ${msg}`);
    }
  }

  if (result.failed > 0) {
    await markZettleConnectionError(
      `${result.failed} Sync-Fehler — siehe fehlgeschlagene Käufe unter Integrationen.`,
    );
  } else {
    await markZettlePurchaseSyncCompleted();
  }

  return result;
}

export async function listRecentZettlePurchaseSyncs(limit = 20): Promise<
  Array<{
    purchaseUuid: string;
    purchaseNumber: number | null;
    purchasedAt: Date | null;
    status: string;
    isRefund: boolean;
    lastError: string | null;
    processedAt: Date | null;
  }>
> {
  try {
    const rows = await getPrisma().zettlePurchaseSync.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      purchaseUuid: r.purchaseUuid,
      purchaseNumber: r.purchaseNumber,
      purchasedAt: r.purchasedAt,
      status: r.status,
      isRefund: r.isRefund,
      lastError: r.lastError,
      processedAt: r.processedAt,
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export async function retryFailedZettlePurchaseSyncs(): Promise<SyncZettlePurchasesResult> {
  // Reset failed → pending_retry so syncZettlePurchases will re-attempt
  await getPrisma().zettlePurchaseSync.updateMany({
    where: { status: "failed" },
    data: { status: "pending_retry", lastError: null },
  });
  return syncZettlePurchases({ lookbackDays: 30, limit: 100 });
}
