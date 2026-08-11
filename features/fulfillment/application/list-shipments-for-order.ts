import type { PrismaClient } from "@/app/generated/prisma/client";
import type { ShipmentStatus } from "@/features/fulfillment/domain/shipment-status-machine";

export type ShipmentListItem = {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  labelProvider: string;
  labelExternalRef: string | null;
  shippedAt: Date | null;
  createdAt: Date;
};

export async function listShipmentsForOrder(
  prisma: PrismaClient,
  orderId: string,
): Promise<ShipmentListItem[]> {
  const rows = await prisma.shipment.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderId: true,
      status: true,
      carrier: true,
      trackingNumber: true,
      labelProvider: true,
      labelExternalRef: true,
      shippedAt: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    status: r.status as ShipmentStatus,
    carrier: r.carrier,
    trackingNumber: r.trackingNumber,
    labelProvider: r.labelProvider,
    labelExternalRef: r.labelExternalRef,
    shippedAt: r.shippedAt,
    createdAt: r.createdAt,
  }));
}
