import { releaseStockReservationsForOrder } from "@/features/inventory";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { createOrderEvent, ORDER_EVENT_STATUS_CHANGED } from "@/lib/orders/order-events";

const log = createLogger("checkout.paypal_cancel");

export type CancelPendingPayPalByTokenResult = "cancelled" | "noop";

/**
 * PayPal-Abbruch (`cancel_url` + `token`): Pending-Bestellung stornieren,
 * Reservierung freigeben. Warenkorb bleibt unberührt (wird erst nach Capture geleert).
 */
export async function cancelPendingPayPalCheckoutByToken(
  paypalOrderIdRaw: string,
): Promise<CancelPendingPayPalByTokenResult> {
  const paypalOrderId = paypalOrderIdRaw.trim();
  if (!paypalOrderId) return "noop";

  const prisma = getPrisma();
  const payment = await prisma.orderPayment.findFirst({
    where: { provider: "paypal", providerRef: paypalOrderId },
    select: {
      id: true,
      orderId: true,
      status: true,
      order: { select: { status: true, promotionId: true } },
    },
  });

  if (!payment) return "noop";
  if (payment.order.status !== "pending_payment") return "noop";

  try {
    await prisma.$transaction(async (tx) => {
      await releaseStockReservationsForOrder(tx, {
        orderId: payment.orderId,
        correlationId: `paypal_cancel:${payment.orderId}`,
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "cancelled" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: "pending_payment",
          toStatus: "cancelled",
        },
      });
      await createOrderEvent(tx, payment.orderId, ORDER_EVENT_STATUS_CHANGED, {
        fromStatus: "pending_payment",
        toStatus: "cancelled",
        source: "paypal_cancel_url",
      });
      await tx.orderPayment.update({
        where: { id: payment.id },
        data: { status: "canceled" },
      });

      if (payment.order.promotionId) {
        await tx.promotion.updateMany({
          where: { id: payment.order.promotionId, usageCount: { gt: 0 } },
          data: { usageCount: { decrement: 1 } },
        });
      }
    });
  } catch (e) {
    log.error("paypal_cancel_failed", {
      paypalOrderId,
      orderId: payment.orderId,
      ...errorMeta(e),
    });
    return "noop";
  }

  log.info("paypal_checkout_cancelled", {
    paypalOrderId,
    orderId: payment.orderId,
  });
  return "cancelled";
}
