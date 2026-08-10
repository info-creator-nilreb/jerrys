import type { PrismaClient } from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  commitStockReservationsForOrder,
} from "@/features/inventory";
import { confirmWorkshopBookingAfterOrderPaid } from "@/features/workshops";
import { createOrderEvent, ORDER_EVENT_STATUS_CHANGED } from "@/lib/orders/order-events";
import { mergeOrderPaymentRefundMeta } from "@/lib/payments/order-payment-refund-meta";

export type FinalizePendingPaymentResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "invalid_status" | "insufficient_stock" | "transaction_failed" };

/**
 * Nach erfolgreicher Online-Zahlung (PayPal Capture o. Ä.): Reservierung committen
 * (oder Legacy-Abbuchung ohne Reservierung), Bestellung auf `paid`, Historie, Zahlungszeile.
 * Idempotent: bei bereits `paid` ohne erneute Bestandsbuchung.
 */
export async function finalizeOrderAfterPendingPaymentCapture(
  prisma: PrismaClient,
  params: {
    orderId: string;
    provider: string;
    providerRef: string;
    eventSource: string;
    /** PayPal Capture-ID für spätere Refunds (optional). */
    providerCaptureId?: string | null;
  },
): Promise<FinalizePendingPaymentResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        include: { items: true },
      });
      if (!order) return { ok: false, error: "not_found" };
      if (order.status === "paid") {
        if (params.providerCaptureId) {
          const payments = await tx.orderPayment.findMany({
            where: {
              orderId: params.orderId,
              provider: params.provider,
              providerRef: params.providerRef,
            },
          });
          for (const payment of payments) {
            await tx.orderPayment.update({
              where: { id: payment.id },
              data: {
                metadata: mergeOrderPaymentRefundMeta(payment.metadata, {
                  paypalCaptureId: params.providerCaptureId,
                }) as Prisma.InputJsonValue,
              },
            });
          }
        }
        return { ok: true };
      }

      if (order.status !== "pending_payment") {
        return { ok: false, error: "invalid_status" };
      }

      const { committedCount } = await commitStockReservationsForOrder(tx, {
        orderId: params.orderId,
        correlationId: params.providerRef,
      });

      const hasWorkshopBooking = await tx.workshopBooking.findFirst({
        where: { orderId: params.orderId },
        select: { id: true },
      });

      if (hasWorkshopBooking) {
        await confirmWorkshopBookingAfterOrderPaid(tx, { orderId: params.orderId });
      } else if (committedCount === 0) {
        const variantIds: string[] = [];
        for (const line of order.items) {
          let variantId = line.productVariantId;
          if (!variantId) {
            const fallback = await tx.productVariant.findFirst({
              where: { productId: line.productId, isDefault: true },
              select: { id: true },
            });
            variantId = fallback?.id ?? null;
          }
          if (!variantId) {
            return { ok: false, error: "insufficient_stock" };
          }
          const v = await tx.productVariant.findUnique({
            where: { id: variantId },
            select: { availableQuantity: true, productId: true },
          });
          if (!v || v.productId !== line.productId || v.availableQuantity < line.quantity) {
            return { ok: false, error: "insufficient_stock" };
          }
          variantIds.push(variantId);
        }
        for (let i = 0; i < order.items.length; i++) {
          const line = order.items[i]!;
          await tx.productVariant.update({
            where: { id: variantIds[i]! },
            data: { availableQuantity: { decrement: line.quantity } },
          });
        }
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

      const payments = await tx.orderPayment.findMany({
        where: {
          orderId: params.orderId,
          provider: params.provider,
          providerRef: params.providerRef,
        },
      });
      for (const payment of payments) {
        await tx.orderPayment.update({
          where: { id: payment.id },
          data: {
            status: "succeeded",
            ...(params.providerCaptureId
              ? {
                  metadata: mergeOrderPaymentRefundMeta(payment.metadata, {
                    paypalCaptureId: params.providerCaptureId,
                  }) as Prisma.InputJsonValue,
                }
              : {}),
          },
        });
      }

      return { ok: true };
    });
  } catch {
    return { ok: false, error: "transaction_failed" };
  }
}
