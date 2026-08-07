import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Markiert aktive Reservierungen nach erfolgreicher Zahlung als committed.
 * Der verkaufbare Bestand wurde bereits bei der Reservierung abgezogen.
 */
export async function commitStockReservationsForOrder(
  tx: Prisma.TransactionClient,
  params: { orderId: string; correlationId?: string },
): Promise<{ committedCount: number }> {
  const active = await tx.stockReservation.findMany({
    where: { orderId: params.orderId, status: "active" },
  });
  if (active.length === 0) {
    return { committedCount: 0 };
  }

  const now = new Date();
  for (const reservation of active) {
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: { status: "committed", committedAt: now },
    });
    await tx.stockMovement.create({
      data: {
        productId: reservation.productId,
        productVariantId: reservation.productVariantId,
        orderId: params.orderId,
        reservationId: reservation.id,
        quantityDelta: 0,
        reason: "reservation_commit",
        correlationId: params.correlationId,
      },
    });
  }

  return { committedCount: active.length };
}
