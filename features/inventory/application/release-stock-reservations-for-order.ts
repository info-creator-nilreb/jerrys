import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Gibt reservierten Bestand frei (Storno vor Zahlung oder Abbruch).
 */
export async function releaseStockReservationsForOrder(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    includeCommitted?: boolean;
    correlationId?: string;
  },
): Promise<{ releasedCount: number }> {
  const statuses = params.includeCommitted
    ? (["active", "committed"] as const)
    : (["active"] as const);

  const reservations = await tx.stockReservation.findMany({
    where: { orderId: params.orderId, status: { in: [...statuses] } },
  });
  if (reservations.length === 0) {
    return { releasedCount: 0 };
  }

  const now = new Date();

  for (const reservation of reservations) {
    await tx.productVariant.update({
      where: { id: reservation.productVariantId },
      data: { availableQuantity: { increment: reservation.quantity } },
    });
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: { status: "released", releasedAt: now },
    });
    await tx.stockMovement.create({
      data: {
        productId: reservation.productId,
        productVariantId: reservation.productVariantId,
        orderId: params.orderId,
        reservationId: reservation.id,
        quantityDelta: reservation.quantity,
        reason: "reservation_release",
        correlationId: params.correlationId,
      },
    });
  }

  return { releasedCount: reservations.length };
}
