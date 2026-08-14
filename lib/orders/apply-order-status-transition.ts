import type { PrismaClient, ShippingCarrier } from "@/app/generated/prisma/client";
import {
  syncManualShipmentOnOrderShipped,
  syncShipmentsOnOrderReturned,
} from "@/features/fulfillment";
import {
  enqueueAndProcessZettleInventoryForOrder,
  releaseStockReservationsForOrder,
} from "@/features/inventory";
import { fulfillmentStatusAfterOrderTransition } from "@/features/orders";
import { sendOrderCancelledIfNeeded } from "@/lib/email/order-cancelled";
import { sendOrderRefundedIfNeeded } from "@/lib/email/order-refunded";
import { sendOrderShippedIfNeeded } from "@/lib/email/order-shipped";
import { allocateNextInvoiceNumber } from "@/lib/invoice/allocate-invoice-number";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { createOrderEvent, ORDER_EVENT_STATUS_CHANGED } from "@/lib/orders/order-events";
import { isAllowedOrderStatusTransition, orderStatusDecrementsWarehouse } from "@/lib/orders/order-status-machine";
import {
  decrementWarehouseForShippedOrder,
  restoreStockOnOrderCancelled,
} from "@/lib/orders/order-stock-on-status";

const log = createLogger("orders.transition");

export type ShipmentDetails = {
  carrier: ShippingCarrier;
  trackingNumber: string;
};

export type TransitionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_found"
        | "invalid_transition"
        | "terminal"
        | "insufficient_warehouse"
        | "shipment_required";
    };

/**
 * Atomarer Statuswechsel inkl. Historie (Aufrufer muss Admin-Rechte geprüft haben).
 * Wechsel auf `shipped` erfordert Versanddaten (Carrier + Sendungsnummer) und stellt ggf. die Rechnung aus.
 * Wechsel auf `abgeholt` verringert den Lagerbestand und stellt die Rechnung aus — ohne Tracking.
 */
export async function applyOrderStatusTransition(
  prisma: PrismaClient,
  orderId: string,
  toStatus: string,
  options?: { shipment?: ShipmentDetails },
): Promise<TransitionResult> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      return { ok: false, error: "not_found" } as const;
    }

    const from = order.status;
    let zettleReturnPush = false;
    if (from === toStatus) {
      return { ok: false, error: "invalid_transition" } as const;
    }

    if (!isAllowedOrderStatusTransition(from, toStatus)) {
      return { ok: false, error: "invalid_transition" } as const;
    }

    if (orderStatusDecrementsWarehouse(toStatus)) {
      if (toStatus === "shipped") {
        const tr = options?.shipment?.trackingNumber?.trim() ?? "";
        if (!options?.shipment?.carrier || !tr) {
          return { ok: false, error: "shipment_required" } as const;
        }
      }

      const stockLines = order.items.flatMap((item) =>
        item.productVariantId
          ? [
              {
                productId: item.productId,
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              },
            ]
          : [],
      );

      const w = await decrementWarehouseForShippedOrder(tx, stockLines, orderId);
      if (!w.ok) return { ok: false, error: "insufficient_warehouse" } as const;
    }

    if (
      toStatus === "retoure" &&
      (from === "shipped" || from === "abgeholt" || from === "completed")
    ) {
      const stockLines = order.items.flatMap((item) =>
        item.productVariantId
          ? [
              {
                productId: item.productId,
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              },
            ]
          : [],
      );
      const restoreFrom = from === "abgeholt" ? "abgeholt" : "shipped";
      const r = await restoreStockOnOrderCancelled(tx, restoreFrom, stockLines, orderId);
      if (!r.ok) return { ok: false, error: "insufficient_warehouse" } as const;
      zettleReturnPush = true;
    }

    if (toStatus === "cancelled") {
      if (from === "pending_payment") {
        await releaseStockReservationsForOrder(tx, {
          orderId,
          correlationId: `cancel:${orderId}`,
        });
      }
      const stockLines = order.items.flatMap((item) =>
        item.productVariantId
          ? [
              {
                productId: item.productId,
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              },
            ]
          : [],
      );
      const r = await restoreStockOnOrderCancelled(tx, from, stockLines, orderId);
      if (!r.ok) return { ok: false, error: "insufficient_warehouse" } as const;
      // Nur wenn Verkauf bereits gezahlt war (Sale-Push) — nicht bei pending_payment.
      if (from === "paid" || from === "processing" || from === "shipped" || from === "abgeholt") {
        zettleReturnPush = true;
      }
    }

    let invoiceNumber: string | undefined;
    let invoiceIssuedAt: Date | undefined;

    const nextFulfillment = fulfillmentStatusAfterOrderTransition(toStatus);

    if (orderStatusDecrementsWarehouse(toStatus) && !order.invoiceNumber) {
      const inv = await allocateNextInvoiceNumber(tx);
      invoiceNumber = inv.invoiceNumber;
      invoiceIssuedAt = inv.issuedAt;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        ...(nextFulfillment ? { fulfillmentStatus: nextFulfillment } : {}),
        ...(toStatus === "shipped" && options?.shipment
          ? {
              shippingCarrier: options.shipment.carrier,
              trackingNumber: options.shipment.trackingNumber.trim(),
            }
          : {}),
        ...(invoiceNumber && invoiceIssuedAt ? { invoiceNumber, invoiceIssuedAt } : {}),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: from,
        toStatus,
      },
    });

    await createOrderEvent(tx, orderId, ORDER_EVENT_STATUS_CHANGED, {
      fromStatus: from,
      toStatus,
    });

    if (toStatus === "shipped" && options?.shipment) {
      await syncManualShipmentOnOrderShipped(tx, {
        orderId,
        carrier: options.shipment.carrier,
        trackingNumber: options.shipment.trackingNumber.trim(),
      });
    }

    if (toStatus === "retoure") {
      await syncShipmentsOnOrderReturned(tx, orderId);
    }

    return { ok: true, zettleReturnPush } as const;
  });

  if (result.ok) {
    try {
      if (toStatus === "shipped") {
        await sendOrderShippedIfNeeded(orderId);
      } else if (toStatus === "cancelled") {
        await sendOrderCancelledIfNeeded(orderId);
      } else if (toStatus === "refunded") {
        await sendOrderRefundedIfNeeded(orderId);
      }
    } catch (e) {
      log.error("post_transition_email_failed", { orderId, toStatus, ...errorMeta(e) });
    }

    if ("zettleReturnPush" in result && result.zettleReturnPush) {
      try {
        await enqueueAndProcessZettleInventoryForOrder({
          orderId,
          kind: "shop_return",
        });
      } catch (e) {
        log.warn("zettle_inventory_return_push_failed", { orderId, ...errorMeta(e) });
      }
    }
  } else if (result.error === "invalid_transition") {
    log.info("transition_rejected", { orderId, toStatus });
  }

  return result.ok ? { ok: true } : result;
}
