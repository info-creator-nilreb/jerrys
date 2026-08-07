import type { Prisma } from "@/app/generated/prisma/client";
import type { ReservationLine } from "@/features/inventory/domain/reservation-line";
import { reservationExpiresAt } from "@/features/inventory/domain/reservation-ttl";

export class InsufficientStockError extends Error {
  readonly code = "insufficient_stock" as const;

  constructor() {
    super("insufficient_stock");
    this.name = "InsufficientStockError";
  }
}

/**
 * Hält verkaufbaren Bestand (`available_quantity`) für eine offene Bestellung atomar.
 * Muss innerhalb einer DB-Transaktion laufen; wirft bei unzureichendem Bestand.
 */
export async function reserveStockForOrder(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    lines: ReservationLine[];
    correlationId?: string;
  },
): Promise<void> {
  for (const line of params.lines) {
    const updated = await tx.product.updateMany({
      where: {
        id: line.productId,
        availableQuantity: { gte: line.quantity },
      },
      data: { availableQuantity: { decrement: line.quantity } },
    });
    if (updated.count !== 1) {
      throw new InsufficientStockError();
    }
  }

  for (const line of params.lines) {
    const reservation = await tx.stockReservation.create({
      data: {
        orderId: params.orderId,
        productId: line.productId,
        quantity: line.quantity,
        status: "active",
        expiresAt: reservationExpiresAt(),
      },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        orderId: params.orderId,
        reservationId: reservation.id,
        quantityDelta: -line.quantity,
        reason: "reservation_hold",
        correlationId: params.correlationId,
      },
    });
  }
}
