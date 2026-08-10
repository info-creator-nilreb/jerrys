import type { Prisma } from "@/app/generated/prisma/client";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { appendIntegrationOutbox } from "@/features/integrations";

export const ORDER_EVENT_PLACED = "order.placed" as const;
export const ORDER_EVENT_STATUS_CHANGED = "order.status_changed" as const;
export const ORDER_EVENT_EMAIL_DELIVERY = "email.delivery" as const;
export const ORDER_EVENT_REFUNDED = "order.refunded" as const;

/**
 * Schreibt ein Ereignis in den Bestell-Auditstrom (`order_events`) und die Integrations-Outbox.
 * `db` kann der Root-Client oder ein Transaktions-Client sein.
 */
export async function createOrderEvent(
  db: Pick<PrismaClient, "orderEvent" | "integrationOutboxMessage">,
  orderId: string,
  eventType: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await db.orderEvent.create({
    data: {
      orderId,
      eventType,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });
  await appendIntegrationOutbox(db, {
    aggregateType: "order",
    aggregateId: orderId,
    eventType,
    payload: metadata ?? {},
  });
}
