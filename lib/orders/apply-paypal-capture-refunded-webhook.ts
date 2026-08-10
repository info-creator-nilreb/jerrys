import type { PrismaClient } from "@/app/generated/prisma/client";
import { applyOrderStatusTransition } from "@/lib/orders/apply-order-status-transition";
import { isAllowedOrderStatusTransition } from "@/lib/orders/order-status-machine";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("orders.paypal_refund_webhook");

function centsFromMoneyString(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/**
 * Best-effort Sync bei PayPal `PAYMENT.CAPTURE.REFUNDED`.
 * Vollständige Erstattung → Shop-Status `refunded`, wenn Transition erlaubt.
 * Teilerstattungen werden nur geloggt (Detail-Persistenz folgt Epic-4-Refund-MVP).
 */
export async function applyPayPalCaptureRefundedWebhook(
  prisma: PrismaClient,
  params: {
    paypalOrderId: string;
    refundAmountValue?: string;
    currencyCode?: string;
  },
): Promise<{ ok: true; action: "refunded" | "partial_logged" | "noop" } | { ok: false; error: string }> {
  const payment = await prisma.orderPayment.findFirst({
    where: { provider: "paypal", providerRef: params.paypalOrderId },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { id: true, status: true, totalGrossCents: true } } },
  });

  if (!payment?.order) {
    return { ok: false, error: "order_not_found" };
  }

  if (payment.order.status === "refunded" || payment.status === "refunded") {
    return { ok: true, action: "noop" };
  }

  const refundCents = centsFromMoneyString(params.refundAmountValue);
  const looksFull =
    refundCents != null &&
    (refundCents >= payment.amountGrossCents || refundCents >= payment.order.totalGrossCents);

  if (!looksFull) {
    log.info("paypal_refund_webhook_partial", {
      orderId: payment.orderId,
      paypalOrderId: params.paypalOrderId,
      refundCents,
      paymentCents: payment.amountGrossCents,
    });
    return { ok: true, action: "partial_logged" };
  }

  if (!isAllowedOrderStatusTransition(payment.order.status, "refunded")) {
    // paid → refunded may not be allowed on this branch yet (Epic 4 refunds PR)
    log.warn("paypal_refund_webhook_status_blocked", {
      orderId: payment.orderId,
      status: payment.order.status,
    });
    await prisma.orderPayment.update({
      where: { id: payment.id },
      data: { status: "refunded" },
    });
    return { ok: true, action: "partial_logged" };
  }

  const transition = await applyOrderStatusTransition(prisma, payment.orderId, "refunded");
  if (!transition.ok) {
    return { ok: false, error: transition.error };
  }

  await prisma.orderPayment.updateMany({
    where: { id: payment.id, status: { in: ["succeeded", "processing", "pending"] } },
    data: { status: "refunded" },
  });

  log.info("paypal_refund_webhook_applied", {
    orderId: payment.orderId,
    paypalOrderId: params.paypalOrderId,
  });
  return { ok: true, action: "refunded" };
}
