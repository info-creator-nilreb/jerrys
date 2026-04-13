import type { PrismaClient } from "@/app/generated/prisma/client";
import { createOrderEvent, ORDER_EVENT_STATUS_CHANGED } from "@/lib/orders/order-events";

export type FinalizePendingPaymentResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "invalid_status" | "insufficient_stock" | "transaction_failed" };

/**
 * Nach erfolgreicher Online-Zahlung (PayPal Capture o. Ä.): **verfügbaren** Bestand abbuchen,
 * Bestellung auf `paid`, Historie, Zahlungszeile. Physisches Lager (`stock_quantity`) erst bei „versandt“.
 * Idempotent: bei bereits `paid` ohne erneute Bestandsbuchung.
 */
export async function finalizeOrderAfterPendingPaymentCapture(
  prisma: PrismaClient,
  params: {
    orderId: string;
    provider: string;
    providerRef: string;
    eventSource: string;
  },
): Promise<FinalizePendingPaymentResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        include: { items: true },
      });
      if (!order) return { ok: false, error: "not_found" };
      if (order.status === "paid") return { ok: true };

      if (order.status !== "pending_payment") {
        return { ok: false, error: "invalid_status" };
      }

      for (const line of order.items) {
        const p = await tx.product.findUnique({
          where: { id: line.productId },
          select: { availableQuantity: true },
        });
        if (!p || p.availableQuantity < line.quantity) {
          return { ok: false, error: "insufficient_stock" };
        }
      }

      for (const line of order.items) {
        await tx.product.update({
          where: { id: line.productId },
          data: { availableQuantity: { decrement: line.quantity } },
        });
      }

      await tx.order.update({
        where: { id: params.orderId },
        data: { status: "paid" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: params.orderId,
          fromStatus: "pending_payment",
          toStatus: "paid",
        },
      });
      await createOrderEvent(tx, params.orderId, ORDER_EVENT_STATUS_CHANGED, {
        fromStatus: "pending_payment",
        toStatus: "paid",
        source: params.eventSource,
      });
      await tx.orderPayment.updateMany({
        where: {
          orderId: params.orderId,
          provider: params.provider,
          providerRef: params.providerRef,
        },
        data: { status: "succeeded" },
      });

      return { ok: true };
    });
  } catch {
    return { ok: false, error: "transaction_failed" };
  }
}
