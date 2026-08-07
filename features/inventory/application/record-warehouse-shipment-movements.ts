import type { Prisma } from "@/app/generated/prisma/client";
import type { ReservationLine } from "@/features/inventory/domain/reservation-line";

/** Audit-Eintrag nach Lagerabbuchung bei Versand (physisches `stock_quantity`). */
export async function recordWarehouseShipmentMovements(
  tx: Prisma.TransactionClient,
  params: { orderId: string; lines: ReservationLine[]; correlationId?: string },
): Promise<void> {
  for (const line of params.lines) {
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        orderId: params.orderId,
        quantityDelta: -line.quantity,
        reason: "warehouse_ship",
        correlationId: params.correlationId,
      },
    });
  }
}
