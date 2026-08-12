import type { Prisma } from "@/app/generated/prisma/client";

export type PosStockLine = {
  productId: string;
  productVariantId: string;
  quantity: number;
};

/**
 * POS-Verkauf: physischen und verkaufbaren Bestand atomar reduzieren.
 * Bei Unterbestand: kein stilles Negativ — wirft Fehler (Sync = failed/alert).
 */
export async function applyPosSaleStockMovements(
  tx: Prisma.TransactionClient,
  params: {
    lines: PosStockLine[];
    correlationId: string;
  },
): Promise<void> {
  for (const line of params.lines) {
    if (line.quantity <= 0) {
      throw new Error("pos_sale quantity must be positive");
    }
    const updated = await tx.productVariant.updateMany({
      where: {
        id: line.productVariantId,
        productId: line.productId,
        stockQuantity: { gte: line.quantity },
        availableQuantity: { gte: line.quantity },
      },
      data: {
        stockQuantity: { decrement: line.quantity },
        availableQuantity: { decrement: line.quantity },
      },
    });
    if (updated.count !== 1) {
      throw new Error(
        `POS-Bestand unzureichend für Variante ${line.productVariantId} (Menge ${line.quantity}).`,
      );
    }
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        productVariantId: line.productVariantId,
        quantityDelta: -line.quantity,
        reason: "pos_sale",
        correlationId: params.correlationId,
      },
    });
  }
}

/**
 * POS-Retoure: Bestand zurückbuchen (Refund mit negativer Quantity aus Zettle).
 */
export async function applyPosRefundStockMovements(
  tx: Prisma.TransactionClient,
  params: {
    lines: PosStockLine[];
    correlationId: string;
  },
): Promise<void> {
  for (const line of params.lines) {
    if (line.quantity <= 0) {
      throw new Error("pos_refund quantity must be positive");
    }
    await tx.productVariant.update({
      where: { id: line.productVariantId },
      data: {
        stockQuantity: { increment: line.quantity },
        availableQuantity: { increment: line.quantity },
      },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        productVariantId: line.productVariantId,
        quantityDelta: line.quantity,
        reason: "pos_refund",
        correlationId: params.correlationId,
      },
    });
  }
}
