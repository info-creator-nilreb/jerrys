import type { PrismaClient } from "@/app/generated/prisma/client";
import { createOrderEvent, ORDER_EVENT_STATUS_CHANGED } from "@/lib/orders/order-events";

export type FinalizeStripePaymentResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "invalid_status" | "insufficient_stock" | "transaction_failed" };

/**
 * Nach erfolgreicher Stripe-Checkout-Zahlung: Lager abbuchen, Bestellung auf `paid`, Historie, Zahlungszeile.
 * Idempotent: bei bereits `paid` ohne erneute Lagerbuchung.
 */
export async function finalizeOrderAfterStripePayment(
  prisma: PrismaClient,
  params: { orderId: string; stripeSessionId: string },
): Promise<FinalizeStripePaymentResult> {
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
          select: { stockQuantity: true },
        });
        if (!p || p.stockQuantity < line.quantity) {
          return { ok: false, error: "insufficient_stock" };
        }
      }

      for (const line of order.items) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stockQuantity: { decrement: line.quantity } },
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
        source: "stripe_webhook",
      });
      await tx.orderPayment.updateMany({
        where: {
          orderId: params.orderId,
          provider: "stripe",
          providerRef: params.stripeSessionId,
        },
        data: { status: "succeeded" },
      });

      return { ok: true };
    });
  } catch {
    return { ok: false, error: "transaction_failed" };
  }
}
