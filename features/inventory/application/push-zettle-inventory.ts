import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import {
  createZettleClientFromConnection,
  type ZettleClient,
} from "@/features/inventory/infrastructure/zettle-client";
import { getZettleConnectionPublic } from "@/features/inventory/infrastructure/zettle-connection";
import { getZettleMappingsByProductVariantIds } from "@/features/inventory/infrastructure/zettle-mapping";
import { generateUuidV1 } from "@/features/inventory/infrastructure/zettle-uuid-v1";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("inventory.zettle-push");

export type ZettlePushLineInput = {
  productVariantId: string;
  quantity: number;
};

export type ZettlePushMappedLine = {
  productVariantId: string;
  zettleProductUuid: string;
  zettleVariantUuid: string;
  quantity: number;
};

export type EnqueueZettleInventoryPushResult = {
  enqueued: boolean;
  correlationId: string;
  status: "pending" | "processed" | "skipped" | "failed";
};

type DbClient = Prisma.TransactionClient | ReturnType<typeof getPrisma>;

function correlationFor(kind: "shop_sale" | "shop_return", orderId: string): string {
  return `${kind}:${orderId}`;
}

async function resolveMappedLines(
  lines: ZettlePushLineInput[],
): Promise<ZettlePushMappedLine[]> {
  const map = await getZettleMappingsByProductVariantIds(
    lines.map((l) => l.productVariantId),
  );
  const out: ZettlePushMappedLine[] = [];
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const m = map.get(line.productVariantId);
    if (!m) continue;
    out.push({
      productVariantId: line.productVariantId,
      zettleProductUuid: m.zettleProductUuid,
      zettleVariantUuid: m.zettleVariantUuid,
      quantity: line.quantity,
    });
  }
  return out;
}

/**
 * Enqueued Shop→Zettle Delta. Idempotent über correlationId.
 * Ohne Mapping oder ohne Zettle-Verbindung → skipped (kein Fehler).
 */
export async function enqueueZettleShopInventoryPush(
  db: DbClient,
  params: {
    orderId: string;
    kind: "shop_sale" | "shop_return";
    lines: ZettlePushLineInput[];
  },
): Promise<EnqueueZettleInventoryPushResult> {
  const correlationId = correlationFor(params.kind, params.orderId);
  try {
    const existing = await db.zettleInventoryPush.findUnique({
      where: { correlationId },
      select: { status: true },
    });
    if (existing) {
      return { enqueued: false, correlationId, status: existing.status };
    }

    const conn = await getZettleConnectionPublic();
    if (!conn.connected || !conn.verified) {
      await db.zettleInventoryPush.create({
        data: {
          correlationId,
          orderId: params.orderId,
          kind: params.kind,
          status: "skipped",
          externalUuid: generateUuidV1(),
          linesJson: [],
          lastError: "Zettle nicht verbunden — Push übersprungen.",
          processedAt: new Date(),
        },
      });
      return { enqueued: true, correlationId, status: "skipped" };
    }

    const mapped = await resolveMappedLines(params.lines);
    if (mapped.length === 0) {
      await db.zettleInventoryPush.create({
        data: {
          correlationId,
          orderId: params.orderId,
          kind: params.kind,
          status: "skipped",
          externalUuid: generateUuidV1(),
          linesJson: [],
          lastError: "Keine gemappten Varianten — Push übersprungen.",
          processedAt: new Date(),
        },
      });
      return { enqueued: true, correlationId, status: "skipped" };
    }

    await db.zettleInventoryPush.create({
      data: {
        correlationId,
        orderId: params.orderId,
        kind: params.kind,
        status: "pending",
        externalUuid: generateUuidV1(),
        linesJson: mapped,
        lastError: null,
      },
    });
    return { enqueued: true, correlationId, status: "pending" };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { enqueued: false, correlationId, status: "skipped" };
    }
    throw e;
  }
}

async function resolveStoreAndSold(client: ZettleClient): Promise<{
  storeUuid: string;
  soldUuid: string;
}> {
  const inventories = await client.listInventories();
  const store =
    inventories.find((i) => i.inventoryType === "STORE" && i.defaultInventory) ||
    inventories.find((i) => i.inventoryType === "STORE");
  const sold = inventories.find((i) => i.inventoryType === "SOLD");
  if (!store || !sold) {
    throw new Error("Zettle STORE-/SOLD-Location nicht gefunden.");
  }
  return { storeUuid: store.inventoryUuid, soldUuid: sold.inventoryUuid };
}

function parseLinesJson(raw: unknown): ZettlePushMappedLine[] {
  if (!Array.isArray(raw)) return [];
  const out: ZettlePushMappedLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const productVariantId = String(r.productVariantId ?? "");
    const zettleProductUuid = String(r.zettleProductUuid ?? "");
    const zettleVariantUuid = String(r.zettleVariantUuid ?? "");
    const quantity = Number(r.quantity);
    if (!productVariantId || !zettleProductUuid || !zettleVariantUuid) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    out.push({
      productVariantId,
      zettleProductUuid,
      zettleVariantUuid,
      quantity: Math.trunc(quantity),
    });
  }
  return out;
}

async function processOnePush(id: string): Promise<"processed" | "skipped" | "failed" | "pending"> {
  const prisma = getPrisma();
  const row = await prisma.zettleInventoryPush.findUnique({ where: { id } });
  if (!row) return "skipped";
  if (row.status === "processed" || row.status === "skipped") return row.status;

  // Return erst nach Sale derselben Order
  if (row.kind === "shop_return" && row.orderId) {
    const sale = await prisma.zettleInventoryPush.findUnique({
      where: { correlationId: correlationFor("shop_sale", row.orderId) },
    });
    if (sale && (sale.status === "pending" || sale.status === "failed")) {
      await processOnePush(sale.id);
      const refreshed = await prisma.zettleInventoryPush.findUnique({
        where: { correlationId: correlationFor("shop_sale", row.orderId) },
      });
      if (refreshed?.status === "failed") {
        await prisma.zettleInventoryPush.update({
          where: { id: row.id },
          data: {
            status: "failed",
            lastError: "Abhängiger Shop-Sale-Push fehlgeschlagen — Return wartet auf Retry.",
          },
        });
        return "failed";
      }
      if (refreshed && refreshed.status !== "processed" && refreshed.status !== "skipped") {
        return "pending";
      }
    }
  }

  const lines = parseLinesJson(row.linesJson);
  if (lines.length === 0) {
    await prisma.zettleInventoryPush.update({
      where: { id: row.id },
      data: {
        status: "skipped",
        lastError: "Keine Positionen.",
        processedAt: new Date(),
      },
    });
    return "skipped";
  }

  try {
    const client = await createZettleClientFromConnection();
    if (!client) {
      await prisma.zettleInventoryPush.update({
        where: { id: row.id },
        data: {
          status: "failed",
          lastError: "Zettle nicht verbunden.",
        },
      });
      return "failed";
    }

    const { storeUuid, soldUuid } = await resolveStoreAndSold(client);
    const from = row.kind === "shop_sale" ? storeUuid : soldUuid;
    const to = row.kind === "shop_sale" ? soldUuid : storeUuid;

    await client.moveInventoryBalances({
      externalUuid: row.externalUuid,
      changes: lines.map((l) => ({
        productUuid: l.zettleProductUuid,
        variantUuid: l.zettleVariantUuid,
        fromLocationUuid: from,
        toLocationUuid: to,
        change: l.quantity,
      })),
    });

    await prisma.zettleInventoryPush.update({
      where: { id: row.id },
      data: {
        status: "processed",
        lastError: null,
        processedAt: new Date(),
      },
    });
    return "processed";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Inventory-Push fehlgeschlagen.";
    const detail =
      e && typeof e === "object" && "responseBody" in e
        ? String((e as { responseBody?: string }).responseBody ?? "").slice(0, 200)
        : "";
    await prisma.zettleInventoryPush.update({
      where: { id: row.id },
      data: {
        status: "failed",
        lastError: detail ? `${msg} ${detail}` : msg,
      },
    });
    log.warn("zettle_inventory_push_failed", {
      id: row.id,
      correlationId: row.correlationId,
      ...errorMeta(e),
    });
    return "failed";
  }
}

export async function processZettleInventoryPushes(options?: {
  limit?: number;
  correlationId?: string;
}): Promise<{ processed: number; failed: number; skipped: number }> {
  const prisma = getPrisma();
  const limit = options?.limit ?? 25;
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    if (options?.correlationId) {
      const one = await prisma.zettleInventoryPush.findUnique({
        where: { correlationId: options.correlationId },
      });
      if (!one) return { processed: 0, failed: 0, skipped: 0 };
      const status = await processOnePush(one.id);
      if (status === "processed") processed++;
      else if (status === "failed") failed++;
      else if (status === "skipped") skipped++;
      return { processed, failed, skipped };
    }

    const pending = await prisma.zettleInventoryPush.findMany({
      where: { status: { in: ["pending", "failed"] } },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true },
    });
    for (const row of pending) {
      const status = await processOnePush(row.id);
      if (status === "processed") processed++;
      else if (status === "failed") failed++;
      else if (status === "skipped") skipped++;
    }
    return { processed, failed, skipped };
  } catch (e) {
    if (isMissingSchemaError(e)) return { processed: 0, failed: 0, skipped: 0 };
    throw e;
  }
}

/** Convenience: Lines aus Order-Items laden und Sale/Return enqueue + sofort versuchen. */
export async function enqueueAndProcessZettleInventoryForOrder(params: {
  orderId: string;
  kind: "shop_sale" | "shop_return";
}): Promise<void> {
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: {
      items: {
        select: { productVariantId: true, quantity: true },
      },
    },
  });
  if (!order) return;

  const lines = order.items
    .filter((i): i is { productVariantId: string; quantity: number } =>
      Boolean(i.productVariantId),
    )
    .map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity }));

  const enq = await enqueueZettleShopInventoryPush(prisma, {
    orderId: params.orderId,
    kind: params.kind,
    lines,
  });
  if (enq.status === "pending" || enq.status === "failed") {
    await processZettleInventoryPushes({ correlationId: enq.correlationId });
  }
}

export async function listRecentZettleInventoryPushes(limit = 15): Promise<
  Array<{
    correlationId: string;
    orderId: string | null;
    kind: string;
    status: string;
    lastError: string | null;
    processedAt: Date | null;
    createdAt: Date;
  }>
> {
  try {
    const rows = await getPrisma().zettleInventoryPush.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        correlationId: true,
        orderId: true,
        kind: true,
        status: true,
        lastError: true,
        processedAt: true,
        createdAt: true,
      },
    });
    return rows;
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}
