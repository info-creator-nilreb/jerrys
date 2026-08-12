import type { PrismaClient } from "@/app/generated/prisma/client";
import {
  createShipmentDraftForOrder,
  type CreateShipmentDraftResult,
} from "@/features/fulfillment/application/create-shipment-draft-for-order";
import {
  createOrderEvent,
  ORDER_EVENT_SHIPMENT_RESHIP_DRAFT,
} from "@/lib/orders/order-events";

export type CreateReshipmentDraftResult =
  | Extract<CreateShipmentDraftResult, { ok: true }>
  | {
      ok: false;
      error:
        | "not_found"
        | "no_physical_items"
        | "order_not_ready"
        | "already_fully_shipped"
        | "cancelled_or_refunded"
        | "open_shipment_exists"
        | "reship_not_applicable";
      message?: string;
    };

/**
 * Admin-Reship nach Retoure: neuer Shipment-Draft mit `forceNew: true`.
 * Voraussetzung: Bestellung ist Retoure / Fulfillment returned / mind. eine
 * returned|voided Sendung — sonst kein Reship-Kontext.
 */
export async function createReshipmentDraftForOrder(
  prisma: PrismaClient,
  orderId: string,
): Promise<CreateReshipmentDraftResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      fulfillmentStatus: true,
      shipments: {
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return { ok: false, error: "not_found" };
  }

  const hasReturnContext =
    order.status === "retoure" ||
    order.fulfillmentStatus === "returned" ||
    order.shipments.some((s) => s.status === "returned" || s.status === "voided");

  if (!hasReturnContext) {
    return {
      ok: false,
      error: "reship_not_applicable",
      message:
        "Erneute Sendung erst nach Retoure möglich (Bestellstatus Retoure oder zurückgegebene Sendung).",
    };
  }

  const draft = await createShipmentDraftForOrder(prisma, orderId, { forceNew: true });
  if (!draft.ok) return draft;

  if (draft.created) {
    await createOrderEvent(prisma, orderId, ORDER_EVENT_SHIPMENT_RESHIP_DRAFT, {
      shipmentId: draft.shipment.id,
      reusedExisting: false,
    });
  }

  return draft;
}
