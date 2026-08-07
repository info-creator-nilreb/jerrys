import type { Prisma } from "@/app/generated/prisma/client";
import {
  createOrderEvent,
  ORDER_EVENT_AVAILABLE_STOCK_RESERVED,
} from "@/lib/orders/order-events";
import type { OrderLineForStock } from "@/lib/orders/order-stock-on-status";

export type AvailableStockError = { ok: false; error: "insufficient_available" };
export type AvailableStockOk = { ok: true };
export type AvailableStockResult = AvailableStockOk | AvailableStockError;

/**
 * Reserviert verfügbaren Shop-Bestand bei angelegter Bestellung (Zahlung noch ausstehend).
 */
export async function reserveAvailableStockForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: OrderLineForStock[],
): Promise<AvailableStockResult> {
  for (const line of items) {
    const p = await tx.product.findUnique({
      where: { id: line.productId },
      select: { availableQuantity: true },
    });
    if (!p || p.availableQuantity < line.quantity) {
      return { ok: false, error: "insufficient_available" };
    }
  }
  for (const line of items) {
    await tx.product.update({
      where: { id: line.productId },
      data: { availableQuantity: { decrement: line.quantity } },
    });
  }
  await createOrderEvent(tx, orderId, ORDER_EVENT_AVAILABLE_STOCK_RESERVED, {
    lineCount: items.length,
  });
  return { ok: true };
}

export async function orderHasAvailableStockReserved(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<boolean> {
  const ev = await tx.orderEvent.findFirst({
    where: { orderId, eventType: ORDER_EVENT_AVAILABLE_STOCK_RESERVED },
    select: { id: true },
  });
  return ev !== null;
}

/** Storno / Abbruch vor Zahlung: Reservierung aufheben. */
export async function releaseAvailableStockReservation(
  tx: Prisma.TransactionClient,
  items: OrderLineForStock[],
): Promise<AvailableStockResult> {
  for (const line of items) {
    await tx.product.update({
      where: { id: line.productId },
      data: { availableQuantity: { increment: line.quantity } },
    });
  }
  return { ok: true };
}
