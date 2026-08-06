import type { Prisma } from "@/app/generated/prisma/client";
import {
  recordWarehouseShipmentMovements,
  releaseStockReservationsForOrder,
} from "@/features/inventory";

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
  orderId?: string,
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
  if (orderId) {
    await recordWarehouseShipmentMovements(tx, {
      orderId,
      lines: items,
      correlationId: `ship:${orderId}`,
    });
  }
  return { ok: true };
}

/**
 * Bei Storno: Reservierungen freigeben oder Legacy-Bestand zurückbuchen.
 */
export async function restoreStockOnOrderCancelled(
  tx: Prisma.TransactionClient,
  fromStatus: string,
  items: OrderLineForStock[],
  orderId?: string,
): Promise<StockAdjustResult> {
  if (fromStatus === "paid" || fromStatus === "processing") {
    if (orderId) {
      const { releasedCount } = await releaseStockReservationsForOrder(tx, {
        orderId,
        includeCommitted: true,
        correlationId: `cancel:${orderId}`,
      });
      if (releasedCount > 0) {
        return { ok: true };
      }
    }
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
