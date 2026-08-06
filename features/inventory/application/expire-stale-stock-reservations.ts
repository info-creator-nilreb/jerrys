import type { PrismaClient } from "@/app/generated/prisma/client";
import { releaseStockReservationsForOrder } from "@/features/inventory/application/release-stock-reservations-for-order";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("inventory.expire_reservations");

export type ExpireStaleStockReservationsResult = {
  ordersTouched: number;
  reservationsReleased: number;
};

/**
 * Gibt abgelaufene aktive Reservierungen frei und storniert hängende `pending_payment`-Bestellungen.
 */
export async function expireStaleStockReservations(
  prisma: PrismaClient,
  params?: { limit?: number; now?: Date },
): Promise<ExpireStaleStockReservationsResult> {
  const now = params?.now ?? new Date();
  const limit = params?.limit ?? 50;

  const stale = await prisma.stockReservation.findMany({
    where: {
      status: "active",
      expiresAt: { lt: now },
    },
    select: { orderId: true },
    distinct: ["orderId"],
    take: limit,
  });

  let reservationsReleased = 0;
  for (const row of stale) {
    const outcome = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: row.orderId },
        select: { id: true, status: true },
      });
      if (!order) return { released: 0 };

      const { releasedCount } = await releaseStockReservationsForOrder(tx, {
        orderId: row.orderId,
        correlationId: `expire:${row.orderId}`,
      });

      if (releasedCount > 0 && order.status === "pending_payment") {
        await tx.order.update({
          where: { id: row.orderId },
          data: { status: "cancelled" },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: row.orderId,
            fromStatus: "pending_payment",
            toStatus: "cancelled",
          },
        });
      }

      return { released: releasedCount };
    });

    reservationsReleased += outcome.released;
    if (outcome.released > 0) {
      log.info("reservation_expired", { orderId: row.orderId, released: outcome.released });
    }
  }

  return { ordersTouched: stale.length, reservationsReleased };
}
