import type { Prisma } from "@/app/generated/prisma/client";

export type OrderLineForStock = { productId: string; quantity: number };

export type StockAdjustError = { ok: false; error: "insufficient_warehouse" };
export type StockAdjustOk = { ok: true };
export type StockAdjustResult = StockAdjustOk | StockAdjustError;

/**
 * Bei Status „shipped“: Lagerbestand (`stock_quantity`) je Position reduzieren.
 */
export async function decrementWarehouseForShippedOrder(
  tx: Prisma.TransactionClient,
  items: OrderLineForStock[],
): Promise<StockAdjustResult> {
  for (const line of items) {
    const p = await tx.product.findUnique({
      where: { id: line.productId },
      select: { stockQuantity: true },
    });
    if (!p || p.stockQuantity < line.quantity) {
      return { ok: false, error: "insufficient_warehouse" };
    }
  }
  for (const line of items) {
    await tx.product.update({
      where: { id: line.productId },
      data: { stockQuantity: { decrement: line.quantity } },
    });
  }
  return { ok: true };
}

/**
 * Bei Storno: Verfügbarkeit zurückgeben; war die Sendung schon raus, auch Lager zurückbuchen.
 */
export async function restoreStockOnOrderCancelled(
  tx: Prisma.TransactionClient,
  fromStatus: string,
  items: OrderLineForStock[],
): Promise<StockAdjustResult> {
  if (fromStatus === "paid" || fromStatus === "processing") {
    for (const line of items) {
      await tx.product.update({
        where: { id: line.productId },
        data: { availableQuantity: { increment: line.quantity } },
      });
    }
    return { ok: true };
  }
  if (fromStatus === "shipped") {
    for (const line of items) {
      await tx.product.update({
        where: { id: line.productId },
        data: {
          availableQuantity: { increment: line.quantity },
          stockQuantity: { increment: line.quantity },
        },
      });
    }
    return { ok: true };
  }
  if (fromStatus === "retoure") {
    return { ok: true };
  }
  return { ok: true };
}
