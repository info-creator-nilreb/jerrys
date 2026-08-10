import type { PrismaClient } from "@/app/generated/prisma/client";
import { createLogger } from "@/lib/logging/logger";
import {
  confirmWorkshopBookingAfterOrderPaid,
  releaseExpiredWorkshopSeatHolds,
} from "@/features/workshops/application/workshop-seat-holds";

const log = createLogger("workshops.maintenance");

export type WorkshopCapacityAlert = {
  sessionId: string;
  title: string;
  reason: string;
  confirmedSeatCount: number;
  heldSeatCount: number;
  capacity: number;
  bookingConfirmedSeats: number;
  bookingHeldSeats: number;
};

export type WorkshopMaintenanceResult = {
  expiredHoldsReleased: number;
  capacityAlerts: WorkshopCapacityAlert[];
  stuckHoldsWithoutExpiry: number;
  incompleteFinalizationsRepaired: number;
};

/**
 * Epic 5 Slice 6: Hold-Ablauf, Kapazitäts-Inkonsistenzen (Alert),
 * und Nachziehen von Buchungen, deren Order bereits `paid` ist.
 */
export async function runWorkshopMaintenance(
  prisma: PrismaClient,
): Promise<WorkshopMaintenanceResult> {
  let expiredHoldsReleased = 0;
  try {
    expiredHoldsReleased = await releaseExpiredWorkshopSeatHolds(prisma);
    if (expiredHoldsReleased > 0) {
      log.info("workshop_holds_expired", { count: expiredHoldsReleased });
    }
  } catch (e) {
    log.error("workshop_holds_expire_failed", { error: String(e) });
  }

  const capacityAlerts = await collectWorkshopCapacityAlerts(prisma);
  for (const alert of capacityAlerts) {
    log.error("workshop_capacity_inconsistency", alert);
  }

  const stuckHoldsWithoutExpiry = await prisma.workshopBooking.count({
    where: { status: "held", holdExpiresAt: null },
  });
  if (stuckHoldsWithoutExpiry > 0) {
    log.error("workshop_stuck_holds_without_expiry", { count: stuckHoldsWithoutExpiry });
  }

  const incompleteFinalizationsRepaired = await repairPaidOrdersStillHeld(prisma);

  return {
    expiredHoldsReleased,
    capacityAlerts,
    stuckHoldsWithoutExpiry,
    incompleteFinalizationsRepaired,
  };
}

async function collectWorkshopCapacityAlerts(
  prisma: PrismaClient,
): Promise<WorkshopCapacityAlert[]> {
  const sessions = await prisma.workshopSession.findMany({
    where: { status: { in: ["published", "cancelled", "completed"] } },
    select: {
      id: true,
      title: true,
      capacity: true,
      confirmedSeatCount: true,
      heldSeatCount: true,
    },
    take: 500,
  });

  const alerts: WorkshopCapacityAlert[] = [];

  for (const session of sessions) {
    const [confirmedAgg, heldAgg] = await Promise.all([
      prisma.workshopBooking.aggregate({
        where: {
          sessionId: session.id,
          status: { in: ["confirmed", "attended", "no_show"] },
        },
        _sum: { seatCount: true },
      }),
      prisma.workshopBooking.aggregate({
        where: { sessionId: session.id, status: "held" },
        _sum: { seatCount: true },
      }),
    ]);

    const bookingConfirmedSeats = confirmedAgg._sum.seatCount ?? 0;
    const bookingHeldSeats = heldAgg._sum.seatCount ?? 0;

    const reasons: string[] = [];
    if (session.confirmedSeatCount < 0 || session.heldSeatCount < 0) {
      reasons.push("negative_counter");
    }
    if (session.confirmedSeatCount + session.heldSeatCount > session.capacity) {
      reasons.push("over_capacity_counters");
    }
    if (session.confirmedSeatCount !== bookingConfirmedSeats) {
      reasons.push("confirmed_counter_mismatch");
    }
    if (session.heldSeatCount !== bookingHeldSeats) {
      reasons.push("held_counter_mismatch");
    }

    if (reasons.length === 0) continue;

    alerts.push({
      sessionId: session.id,
      title: session.title,
      reason: reasons.join(","),
      confirmedSeatCount: session.confirmedSeatCount,
      heldSeatCount: session.heldSeatCount,
      capacity: session.capacity,
      bookingConfirmedSeats,
      bookingHeldSeats,
    });
  }

  return alerts;
}

/** Order bereits bezahlt, Buchung noch `held` → idempotent bestätigen. */
async function repairPaidOrdersStillHeld(prisma: PrismaClient): Promise<number> {
  const stuck = await prisma.workshopBooking.findMany({
    where: {
      status: "held",
      orderId: { not: null },
    },
    select: { id: true, orderId: true },
    take: 50,
  });

  let repaired = 0;
  for (const row of stuck) {
    if (!row.orderId) continue;
    const order = await prisma.order.findUnique({
      where: { id: row.orderId },
      select: { id: true, status: true },
    });
    if (!order || order.status !== "paid") continue;
    try {
      await prisma.$transaction(async (tx) => {
        await confirmWorkshopBookingAfterOrderPaid(tx, { orderId: row.orderId! });
      });
      repaired += 1;
      log.info("workshop_incomplete_finalization_repaired", {
        bookingId: row.id,
        orderId: row.orderId,
      });
    } catch (e) {
      log.error("workshop_incomplete_finalization_repair_failed", {
        bookingId: row.id,
        orderId: row.orderId,
        error: String(e),
      });
    }
  }
  return repaired;
}
