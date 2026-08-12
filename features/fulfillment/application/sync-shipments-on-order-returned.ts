import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { isAllowedShipmentTransition } from "@/features/fulfillment/domain/shipment-status-machine";

type Db = PrismaClient | Prisma.TransactionClient;

export type SyncShipmentsOnOrderReturnedResult = {
  updatedShipmentIds: string[];
};

/**
 * Spiegelt Bestellstatus „retoure“ auf offene/zugestellte Sendungen:
 * `shipped` / `delivered` → `returned`. Draft/Label/voided bleiben unverändert.
 */
export async function syncShipmentsOnOrderReturned(
  prisma: Db,
  orderId: string,
): Promise<SyncShipmentsOnOrderReturnedResult> {
  const rows = await prisma.shipment.findMany({
    where: {
      orderId,
      status: { in: ["shipped", "delivered"] },
    },
    select: { id: true, status: true },
  });

  const updatedShipmentIds: string[] = [];
  for (const row of rows) {
    if (!isAllowedShipmentTransition(row.status, "returned")) continue;
    await prisma.shipment.update({
      where: { id: row.id },
      data: { status: "returned" },
    });
    updatedShipmentIds.push(row.id);
  }

  return { updatedShipmentIds };
}
