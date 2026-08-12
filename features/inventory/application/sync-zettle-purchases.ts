import "server-only";

import {
  applyPosRefundStockMovements,
  applyPosSaleStockMovements,
} from "@/features/inventory/application/apply-pos-stock-movements";
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

export type ApplyZettlePurchaseResult =
  | { status: "processed" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

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

/** Verarbeitet einen einzelnen Zettle-Kauf idempotent (Pull-Sync und Webhook). */
export async function applyZettlePurchase(
  purchase: ZettlePurchase,
): Promise<ApplyZettlePurchaseResult> {
  const purchaseUuid = purchaseUuidOf(purchase);
  if (!purchaseUuid) {
    return { status: "skipped", reason: "Kauf ohne UUID." };
  }

  const prisma = getPrisma();
  const existing = await prisma.zettlePurchaseSync.findUnique({
    where: { purchaseUuid },
  });
  if (existing?.status === "processed" || existing?.status === "skipped") {
    return { status: "skipped", reason: `Bereits ${existing.status}.` };
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
    if (!Number.isInteger(qtyAbs)) {
      hasUnmapped = true;
      unmappedDetail = `Nicht-ganzzahlige Menge (${line.quantity}) — bitte manuell prüfen.`;
      continue;
    }
    if (!line.variantUuid) continue;
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
    return hasUnmapped
      ? { status: "failed", reason: unmappedDetail || "Keine gemappten Positionen." }
      : { status: "skipped", reason: "Keine lagerrelevanten Positionen." };
  }

  if (hasUnmapped) {
    const reason = `Teilweise ungemappt: ${unmappedDetail}`;
    await prisma.zettlePurchaseSync.upsert({
      where: { purchaseUuid },
      create: {
        purchaseUuid,
        purchaseNumber: purchase.purchaseNumber ?? null,
        purchasedAt: purchasedAtOf(purchase),
        status: "failed",
        isRefund,
        lastError: reason,
      },
      update: { status: "failed", lastError: reason, isRefund },
    });
    return { status: "failed", reason };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const again = await tx.zettlePurchaseSync.findUnique({
        where: { purchaseUuid },
      });
      if (again?.status === "processed") return;

      const correlationId = `zettle:${purchaseUuid}`;
      if (isRefund) {
        await applyPosRefundStockMovements(tx, { lines: mappedLines, correlationId });
      } else {
        await applyPosSaleStockMovements(tx, { lines: mappedLines, correlationId });
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
    return { status: "processed" };
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
    return { status: "failed", reason: msg };
  }
}

/**
 * Zieht aktuelle Zettle-Käufe und bucht gemappte Varianten idempotent ab.
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

  for (const purchase of purchases) {
    const uuid = purchaseUuidOf(purchase) ?? "?";
    const applied = await applyZettlePurchase(purchase);
    if (applied.status === "processed") result.processed += 1;
    else if (applied.status === "skipped") result.skipped += 1;
    else {
      result.failed += 1;
      result.errors.push(`${uuid}: ${applied.reason}`);
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

/** Webhook: Kauf per UUID nachladen und verbuchen. */
export async function syncZettlePurchaseByUuid(
  purchaseUuid: string,
): Promise<ApplyZettlePurchaseResult> {
  const client = await createZettleClientFromConnection();
  if (!client) {
    return { status: "failed", reason: "Zettle ist nicht verbunden." };
  }
  const purchase = await client.getPurchase(purchaseUuid);
  return applyZettlePurchase(purchase);
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
  await getPrisma().zettlePurchaseSync.updateMany({
    where: { status: "failed" },
    data: { status: "pending_retry", lastError: null },
  });
  return syncZettlePurchases({ lookbackDays: 30, limit: 100 });
}
