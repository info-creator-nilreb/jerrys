import type { Prisma, PrismaClient, ShippingCarrier } from "@/app/generated/prisma/client";
import { isAllowedShipmentTransition } from "@/features/fulfillment/domain/shipment-status-machine";

type Db = PrismaClient | Prisma.TransactionClient;

export type SyncManualShipmentOnOrderShippedResult = {
  shipmentId: string;
  created: boolean;
  updated: boolean;
};

/**
 * Spiegelt den manuellen Admin-Status „shipped“ (Carrier + Tracking) in `shipments`.
 * - Offener Draft/Labeled → Status shipped (+ Tracking)
 * - Sonst neue Shipment-Zeile mit labelProvider=none
 */
export async function syncManualShipmentOnOrderShipped(
  prisma: Db,
  input: {
    orderId: string;
    carrier: ShippingCarrier;
    trackingNumber: string;
  },
): Promise<SyncManualShipmentOnOrderShippedResult> {
  const tracking = input.trackingNumber.trim();
  const open = await prisma.shipment.findFirst({
    where: {
      orderId: input.orderId,
      status: { in: ["draft", "labeled"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      trackingNumber: true,
      carrier: true,
    },
  });

  if (open) {
    if (!isAllowedShipmentTransition(open.status, "shipped") && open.status !== "shipped") {
      // Defensiv: sollte bei draft/labeled immer erlaubt sein.
    }
    await prisma.shipment.update({
      where: { id: open.id },
      data: {
        status: "shipped",
        carrier: input.carrier,
        trackingNumber: tracking || open.trackingNumber,
        shippedAt: new Date(),
      },
    });
    return { shipmentId: open.id, created: false, updated: true };
  }

  const existingShipped = await prisma.shipment.findFirst({
    where: { orderId: input.orderId, status: "shipped" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existingShipped) {
    await prisma.shipment.update({
      where: { id: existingShipped.id },
      data: {
        carrier: input.carrier,
        trackingNumber: tracking,
        shippedAt: new Date(),
      },
    });
    return { shipmentId: existingShipped.id, created: false, updated: true };
  }

  const created = await prisma.shipment.create({
    data: {
      orderId: input.orderId,
      status: "shipped",
      carrier: input.carrier,
      trackingNumber: tracking,
      labelProvider: "none",
      shippedAt: new Date(),
    },
    select: { id: true },
  });

  return { shipmentId: created.id, created: true, updated: false };
}
