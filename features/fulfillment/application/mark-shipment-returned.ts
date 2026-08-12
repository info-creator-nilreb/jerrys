import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import {
  isAllowedShipmentTransition,
  type ShipmentStatus,
} from "@/features/fulfillment/domain/shipment-status-machine";

type Db = PrismaClient | Prisma.TransactionClient;

export type MarkShipmentReturnedResult =
  | {
      ok: true;
      shipmentId: string;
      orderId: string;
      alreadyReturned: boolean;
    }
  | {
      ok: false;
      error: "not_found" | "invalid_status";
      message: string;
    };

/**
 * Markiert eine Sendung als Retoure (`shipped`/`delivered` → `returned`).
 * Bestellstatus bleibt unberührt — Aufrufer kann parallel `retoure` setzen.
 */
export async function markShipmentReturned(
  prisma: Db,
  shipmentId: string,
): Promise<MarkShipmentReturnedResult> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, orderId: true, status: true },
  });

  if (!shipment) {
    return { ok: false, error: "not_found", message: "Sendung nicht gefunden." };
  }

  const status = shipment.status as ShipmentStatus;
  if (status === "returned") {
    return {
      ok: true,
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      alreadyReturned: true,
    };
  }

  if (!isAllowedShipmentTransition(status, "returned")) {
    return {
      ok: false,
      error: "invalid_status",
      message: `Sendung im Status „${status}“ kann nicht als Retoure markiert werden.`,
    };
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: { status: "returned" },
  });

  return {
    ok: true,
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    alreadyReturned: false,
  };
}
