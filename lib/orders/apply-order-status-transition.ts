import type { PrismaClient } from "@/app/generated/prisma/client";
import { sendOrderCancelledIfNeeded } from "@/lib/email/order-cancelled";
import { sendOrderRefundedIfNeeded } from "@/lib/email/order-refunded";
import { sendOrderShippedIfNeeded } from "@/lib/email/order-shipped";
import { createOrderEvent, ORDER_EVENT_STATUS_CHANGED } from "@/lib/orders/order-events";
import { isAllowedOrderStatusTransition } from "@/lib/orders/order-status-machine";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("orders.transition");

export type TransitionResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "invalid_transition" | "terminal" };

/**
 * Atomarer Statuswechsel inkl. Historie (Aufrufer muss Admin-Rechte geprüft haben).
 */
export async function applyOrderStatusTransition(
  prisma: PrismaClient,
  orderId: string,
  toStatus: string,
): Promise<TransitionResult> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
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

    await tx.order.update({
      where: { id: orderId },
      data: { status: toStatus },
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
