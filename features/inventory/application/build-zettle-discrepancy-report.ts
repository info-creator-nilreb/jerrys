import "server-only";

import { createZettleClientFromConnection } from "@/features/inventory/infrastructure/zettle-client";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

export type ZettleDiscrepancyRow = {
  productVariantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string;
  shopStock: number;
  shopAvailable: number;
  zettleBalance: number | null;
  zettleTracked: boolean;
  delta: number | null;
  zettleVariantUuid: string;
  zettleProductName: string | null;
};

export type ZettleDiscrepancyReport = {
  ok: boolean;
  error?: string;
  compared: number;
  mismatches: number;
  untracked: number;
  rows: ZettleDiscrepancyRow[];
};

/**
 * Vergleicht gemappte Shop-Bestände mit Zettle STORE-Inventory.
 * Zettle überschreibt den Shop nicht — nur Report/Alert.
 */
export async function buildZettleDiscrepancyReport(): Promise<ZettleDiscrepancyReport> {
  try {
    const mappings = await getPrisma().zettleProductMapping.findMany({
      include: {
        productVariant: {
          select: {
            id: true,
            title: true,
            sku: true,
            stockQuantity: true,
            availableQuantity: true,
            product: { select: { title: true } },
          },
        },
      },
      take: 500,
    });

    if (mappings.length === 0) {
      return { ok: true, compared: 0, mismatches: 0, untracked: 0, rows: [] };
    }

    const client = await createZettleClientFromConnection();
    if (!client) {
      return {
        ok: false,
        error: "Zettle nicht verbunden.",
        compared: 0,
        mismatches: 0,
        untracked: 0,
        rows: [],
      };
    }

    let balances;
    try {
      balances = await client.listStoreInventoryBalances();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Inventory API fehlgeschlagen.";
      return {
        ok: false,
        error: `${msg} (Scopes WRITE:PRODUCT / Inventory nötig?)`,
        compared: 0,
        mismatches: 0,
        untracked: 0,
        rows: [],
      };
    }

    const byVariant = new Map(balances.map((b) => [b.variantUuid, b.balance]));

    const rows: ZettleDiscrepancyRow[] = mappings.map((m) => {
      const zettleBalance = byVariant.has(m.zettleVariantUuid)
        ? (byVariant.get(m.zettleVariantUuid) as number)
        : null;
      const shopStock = m.productVariant.stockQuantity;
      const delta = zettleBalance == null ? null : shopStock - zettleBalance;
      return {
        productVariantId: m.productVariantId,
        productTitle: m.productVariant.product.title,
        variantTitle: m.productVariant.title,
        sku: m.productVariant.sku,
        shopStock,
        shopAvailable: m.productVariant.availableQuantity,
        zettleBalance,
        zettleTracked: zettleBalance != null,
        delta,
        zettleVariantUuid: m.zettleVariantUuid,
        zettleProductName: m.zettleProductName,
      };
    });

    const mismatches = rows.filter((r) => r.delta != null && r.delta !== 0).length;
    const untracked = rows.filter((r) => !r.zettleTracked).length;

    return {
      ok: true,
      compared: rows.length,
      mismatches,
      untracked,
      rows: rows.sort((a, b) => {
        const da = a.delta == null ? 0 : Math.abs(a.delta);
        const db = b.delta == null ? 0 : Math.abs(b.delta);
        return db - da;
      }),
    };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: true, compared: 0, mismatches: 0, untracked: 0, rows: [] };
    }
    throw e;
  }
}
