import type { PrismaClient, ShippingCarrier } from "@/app/generated/prisma/client";
import { sendOrderCancelledIfNeeded } from "@/lib/email/order-cancelled";
import { sendOrderRefundedIfNeeded } from "@/lib/email/order-refunded";
import { sendOrderShippedIfNeeded } from "@/lib/email/order-shipped";
import { allocateNextInvoiceNumber } from "@/lib/invoice/allocate-invoice-number";
import { createOrderEvent, ORDER_EVENT_STATUS_CHANGED } from "@/lib/orders/order-events";
import { isAllowedOrderStatusTransition } from "@/lib/orders/order-status-machine";
import {
  decrementWarehouseForShippedOrder,
  restoreStockOnOrderCancelled,
} from "@/lib/orders/order-stock-on-status";
import { createLogger, errorMeta } from "@/lib/logging/logger";

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
    if (from === toStatus) {
      return { ok: false, error: "invalid_transition" } as const;
    }

    if (!isAllowedOrderStatusTransition(from, toStatus)) {
      return { ok: false, error: "invalid_transition" } as const;
    }

    if (toStatus === "shipped") {
      const tr = options?.shipment?.trackingNumber?.trim() ?? "";
      if (!options?.shipment?.carrier || !tr) {
        return { ok: false, error: "shipment_required" } as const;
      }

      const w = await decrementWarehouseForShippedOrder(tx, order.items);
      if (!w.ok) return { ok: false, error: "insufficient_warehouse" } as const;
    }

    if (toStatus === "retoure" && (from === "shipped" || from === "completed")) {
      const r = await restoreStockOnOrderCancelled(tx, "shipped", order.items);
      if (!r.ok) return { ok: false, error: "insufficient_warehouse" } as const;
    }

    if (toStatus === "cancelled") {
      const r = await restoreStockOnOrderCancelled(tx, from, order.items);
      if (!r.ok) return { ok: false, error: "insufficient_warehouse" } as const;
    }

    let invoiceNumber: string | undefined;
    let invoiceIssuedAt: Date | undefined;

    if (toStatus === "shipped" && !order.invoiceNumber) {
      const inv = await allocateNextInvoiceNumber(tx);
      invoiceNumber = inv.invoiceNumber;
      invoiceIssuedAt = inv.issuedAt;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        ...(toStatus === "shipped" && options?.shipment
          ? {
              shippingCarrier: options.shipment.carrier,
              trackingNumber: options.shipment.trackingNumber.trim(),
              ...(invoiceNumber && invoiceIssuedAt
                ? { invoiceNumber, invoiceIssuedAt }
                : {}),
            }
          : {}),
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

    return { ok: true } as const;
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
  } else if (result.error === "invalid_transition") {
    log.info("transition_rejected", { orderId, toStatus });
  }

  return result;
}
