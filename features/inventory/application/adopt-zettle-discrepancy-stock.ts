import "server-only";

import {
  buildZettleDiscrepancyReport,
  type ZettleDiscrepancyRow,
} from "@/features/inventory/application/build-zettle-discrepancy-report";
import {
  coupledStockAfterZettleAdoption,
  stockAdjustmentDelta,
} from "@/features/inventory/domain/stock-quantity-coupling";
import { getPrisma } from "@/lib/db/prisma";

export type AdoptZettleStockResult = {
  ok: boolean;
  adopted: number;
  skipped: number;
  errors: string[];
};

function isAdoptableRow(row: ZettleDiscrepancyRow): boolean {
  return row.zettleTracked && row.zettleBalance != null && row.delta != null && row.delta !== 0;
}

async function adoptRow(row: ZettleDiscrepancyRow): Promise<{ adopted: boolean; error?: string }> {
  const variant = await getPrisma().productVariant.findUnique({
    where: { id: row.productVariantId },
    select: {
      id: true,
      productId: true,
      stockQuantity: true,
      availableQuantity: true,
    },
  });
  if (!variant) {
    return { adopted: false, error: "Shop-Variante nicht gefunden." };
  }
  if (row.zettleBalance == null) {
    return { adopted: false, error: "Kein Zettle-Bestand." };
  }

  const coupled = coupledStockAfterZettleAdoption({
    previousStock: variant.stockQuantity,
    previousAvailable: variant.availableQuantity,
    zettleBalance: row.zettleBalance,
  });
  if (!coupled.ok) {
    return { adopted: false, error: coupled.error };
  }

  const previous = {
    stockQuantity: variant.stockQuantity,
    availableQuantity: variant.availableQuantity,
  };
  const delta = stockAdjustmentDelta(previous, coupled.quantities);
  if (delta === 0) {
    return { adopted: false };
  }

  await getPrisma().$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id: variant.id },
      data: coupled.quantities,
    });
    await tx.stockMovement.create({
      data: {
        productId: variant.productId,
        productVariantId: variant.id,
        quantityDelta: delta,
        reason: "manual_adjustment",
        correlationId: `zettle-adopt:${variant.id}:${row.zettleBalance}`,
      },
    });
  });

  return { adopted: true };
}

/**
 * Übernimmt Zettle STORE-Bestände für gemappte Varianten (optional einzeln oder alle Abweichungen).
 * Verfügbar wird auf Zettle gesetzt; physisch folgt per Delta (Reservierungs-Lücke bleibt erhalten).
 */
export async function adoptZettleDiscrepancyStock(input: {
  productVariantIds?: string[];
  adoptAllMismatches?: boolean;
}): Promise<AdoptZettleStockResult> {
  const report = await buildZettleDiscrepancyReport();
  if (!report.ok) {
    return { ok: false, adopted: 0, skipped: 0, errors: [report.error ?? "Discrepancy-Report fehlgeschlagen."] };
  }

  let rows = report.rows.filter(isAdoptableRow);
  if (input.productVariantIds?.length) {
    const ids = new Set(input.productVariantIds);
    rows = rows.filter((r) => ids.has(r.productVariantId));
  } else if (!input.adoptAllMismatches) {
    return { ok: false, adopted: 0, skipped: 0, errors: ["Keine Varianten ausgewählt."] };
  }

  if (rows.length === 0) {
    return { ok: true, adopted: 0, skipped: 0, errors: [] };
  }

  let adopted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const result = await adoptRow(row);
      if (result.adopted) {
        adopted += 1;
      } else {
        skipped += 1;
        if (result.error) {
          errors.push(`${row.productTitle}${row.variantTitle ? ` — ${row.variantTitle}` : ""}: ${result.error}`);
        }
      }
    } catch (e) {
      skipped += 1;
      errors.push(
        `${row.productTitle}${row.variantTitle ? ` — ${row.variantTitle}` : ""}: ${
          e instanceof Error ? e.message : "Speichern fehlgeschlagen."
        }`,
      );
    }
  }

  return { ok: errors.length === 0 || adopted > 0, adopted, skipped, errors };
}
