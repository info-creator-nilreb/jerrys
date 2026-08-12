import type { PrismaClient } from "@/app/generated/prisma/client";
import { evaluateOrderShipmentEligibility } from "@/features/fulfillment/domain/order-eligible-for-shipment";

export type CreateShipmentDraftResult =
  | {
      ok: true;
      shipment: {
        id: string;
        orderId: string;
        status: "draft";
      };
      created: boolean;
    }
  | {
      ok: false;
      error:
        | "not_found"
        | "no_physical_items"
        | "order_not_ready"
        | "already_fully_shipped"
        | "cancelled_or_refunded"
        | "open_shipment_exists";
    };

/**
 * Legt einen Shipment-Draft für eine geeignete Warenbestellung an.
 * Idempotent bzgl. bestehendem offenen Draft (gibt diesen zurück, created=false).
 *
 * `forceNew` (Reship): nutzt Reship-Eligibility (auch nach Retoure/shipped) und legt
 * einen neuen Draft an, sofern kein offenes Label existiert. Offener Draft wird
 * wiederverwendet (kein Doppel-Draft).
 */
export async function createShipmentDraftForOrder(
  prisma: PrismaClient,
  orderId: string,
  options?: { forceNew?: boolean },
): Promise<CreateShipmentDraftResult> {
  const forceNew = Boolean(options?.forceNew);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      fulfillmentStatus: true,
      items: {
        select: {
          quantity: true,
          productVariantId: true,
        },
      },
      shipments: {
        where: { status: { in: ["draft", "labeled"] } },
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) {
    return { ok: false, error: "not_found" };
  }

  const physicalItemQuantity = order.items
    .filter((i) => i.productVariantId != null)
    .reduce((sum, i) => sum + i.quantity, 0);

  const eligibility = evaluateOrderShipmentEligibility({
    orderStatus: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    physicalItemQuantity,
    reship: forceNew,
  });
  if (!eligibility.ok) {
    return { ok: false, error: eligibility.reason };
  }

  const existing = order.shipments[0];
  if (existing) {
    if (existing.status === "draft") {
      return {
        ok: true,
        created: false,
        shipment: { id: existing.id, orderId: order.id, status: "draft" },
      };
    }
    // Offenes Label — auch bei Reship zuerst stornieren.
    return { ok: false, error: "open_shipment_exists" };
  }

  const created = await prisma.shipment.create({
    data: {
      orderId: order.id,
      status: "draft",
      labelProvider: "none",
    },
    select: { id: true, orderId: true, status: true },
  });

  return {
    ok: true,
    created: true,
    shipment: {
      id: created.id,
      orderId: created.orderId,
      status: "draft",
    },
  };
}
