import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { sendWorkshopBookingCancelledForBookingId } from "@/lib/email/workshop-booking-emails";
import { createLogger } from "@/lib/logging/logger";
import {
  WORKSHOP_BOOKING_EVENT_ADMIN_CANCELLED,
  WORKSHOP_BOOKING_EVENT_ATTENDANCE_UPDATED,
  WORKSHOP_BOOKING_EVENT_SESSION_CANCELLED,
  createWorkshopBookingEvent,
} from "@/features/workshops/application/workshop-booking-events";
import { workshopBookingStatusLabel } from "@/features/workshops/domain/booking-status";

const log = createLogger("workshops.admin-bookings");

export type AdminWorkshopBookingListItem = {
  id: string;
  contactEmail: string;
  seatCount: number;
  status: string;
  statusLabel: string;
  createdAt: Date;
  cancelledAt: Date | null;
  customerId: string | null;
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
  paymentSummary: string;
  unitPriceCents: number;
  currency: string;
};

export type AdminWorkshopSessionParticipationSummary = {
  confirmedSeatCount: number;
  heldSeatCount: number;
  capacity: number;
  minimumParticipants: number;
  meetsMinimum: boolean;
  confirmedBookingCount: number;
};

function paymentSummaryForBooking(input: {
  unitPriceCents: number;
  order: { status: string; paymentMethod: string } | null;
}): string {
  if (input.unitPriceCents <= 0) return "Kostenlos";
  if (!input.order) return "Ohne Bestellung";
  if (input.order.status === "paid") {
    return input.order.paymentMethod === "paypal" ? "Bezahlt (PayPal)" : "Bezahlt";
  }
  if (input.order.status === "pending_payment") return "Zahlung ausstehend";
  if (input.order.status === "cancelled") return "Bestellung storniert";
  return input.order.status;
}

export async function getWorkshopSessionParticipationSummaryForAdmin(
  sessionId: string,
): Promise<AdminWorkshopSessionParticipationSummary | null> {
  try {
    const session = await getPrisma().workshopSession.findUnique({
      where: { id: sessionId },
      select: {
        confirmedSeatCount: true,
        heldSeatCount: true,
        capacity: true,
        minimumParticipants: true,
      },
    });
    if (!session) return null;

    const confirmedBookingCount = await getPrisma().workshopBooking.count({
      where: { sessionId, status: "confirmed" },
    });

    return {
      confirmedSeatCount: session.confirmedSeatCount,
      heldSeatCount: session.heldSeatCount,
      capacity: session.capacity,
      minimumParticipants: session.minimumParticipants,
      meetsMinimum: session.confirmedSeatCount >= session.minimumParticipants,
      confirmedBookingCount,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

export async function listWorkshopBookingsForAdminSession(
  sessionId: string,
): Promise<AdminWorkshopBookingListItem[]> {
  try {
    const rows = await getPrisma().workshopBooking.findMany({
      where: { sessionId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        contactEmail: true,
        seatCount: true,
        status: true,
        createdAt: true,
        cancelledAt: true,
        customerId: true,
        orderId: true,
        unitPriceCentsSnapshot: true,
        currencySnapshot: true,
      },
    });

    const orderIds = rows.map((r) => r.orderId).filter((id): id is string => Boolean(id));
    const orders =
      orderIds.length > 0
        ? await getPrisma().order.findMany({
            where: { id: { in: orderIds } },
            select: { id: true, orderNumber: true, status: true, paymentMethod: true },
          })
        : [];
    const orderById = new Map(orders.map((o) => [o.id, o]));

    return rows.map((row) => {
      const order = row.orderId ? orderById.get(row.orderId) ?? null : null;
      return {
        id: row.id,
        contactEmail: row.contactEmail,
        seatCount: row.seatCount,
        status: row.status,
        statusLabel: workshopBookingStatusLabel(row.status),
        createdAt: row.createdAt,
        cancelledAt: row.cancelledAt,
        customerId: row.customerId,
        orderId: row.orderId,
        orderNumber: order?.orderNumber ?? null,
        orderStatus: order?.status ?? null,
        paymentSummary: paymentSummaryForBooking({
          unitPriceCents: row.unitPriceCentsSnapshot,
          order,
        }),
        unitPriceCents: row.unitPriceCentsSnapshot,
        currency: row.currencySnapshot,
      };
    });
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export type AdminMutateWorkshopBookingResult =
  | { ok: true }
  | { ok: false; message: string };

const ATTENDANCE_STATUSES = new Set(["confirmed", "attended", "no_show"]);

export async function setWorkshopBookingAttendanceForAdmin(input: {
  bookingId: string;
  status: "confirmed" | "attended" | "no_show";
}): Promise<AdminMutateWorkshopBookingResult> {
  if (!ATTENDANCE_STATUSES.has(input.status)) {
    return { ok: false, message: "Ungültiger Anwesenheitsstatus." };
  }

  const prisma = getPrisma();
  try {
    const booking = await prisma.workshopBooking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, status: true, session: { select: { status: true } } },
    });
    if (!booking) return { ok: false, message: "Buchung nicht gefunden." };
    if (booking.session.status === "completed") {
      return { ok: false, message: "Abgeschlossene Termine können nicht mehr geändert werden." };
    }
    if (!["confirmed", "attended", "no_show"].includes(booking.status)) {
      return { ok: false, message: "Nur bestätigte oder erfasste Anwesenheiten können gesetzt werden." };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.workshopBooking.updateMany({
        where: {
          id: input.bookingId,
          status: { in: ["confirmed", "attended", "no_show"] },
        },
        data: { status: input.status },
      });
      if (updated.count === 0) throw new Error("update_failed");

      await createWorkshopBookingEvent(tx, input.bookingId, WORKSHOP_BOOKING_EVENT_ATTENDANCE_UPDATED, {
        status: input.status,
      });
    });

    return { ok: true };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, message: "Termin-Modul nicht verfügbar." };
    }
    if (String(e).includes("update_failed")) {
      return { ok: false, message: "Status konnte nicht gesetzt werden." };
    }
    throw e;
  }
}

export async function adminCancelWorkshopBooking(input: {
  bookingId: string;
}): Promise<AdminMutateWorkshopBookingResult> {
  const prisma = getPrisma();
  const booking = await prisma.workshopBooking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      status: true,
      seatCount: true,
      sessionId: true,
      unitPriceCentsSnapshot: true,
      orderId: true,
    },
  });

  if (!booking) return { ok: false, message: "Buchung nicht gefunden." };
  if (booking.status === "cancelled") return { ok: true };
  if (booking.status !== "confirmed") {
    return { ok: false, message: "Nur bestätigte Buchungen können storniert werden." };
  }

  const refundDue = booking.unitPriceCentsSnapshot > 0 && Boolean(booking.orderId);

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.workshopBooking.updateMany({
        where: { id: booking.id, status: "confirmed" },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: "admin_cancel",
        },
      });
      if (updated.count === 0) throw new Error("booking_not_confirmed");

      const seatRelease = await tx.workshopSession.updateMany({
        where: {
          id: booking.sessionId,
          confirmedSeatCount: { gte: booking.seatCount },
        },
        data: { confirmedSeatCount: { decrement: booking.seatCount } },
      });
      if (seatRelease.count === 0) throw new Error("capacity_release_failed");

      await createWorkshopBookingEvent(tx, booking.id, WORKSHOP_BOOKING_EVENT_ADMIN_CANCELLED, {
        seatCount: booking.seatCount,
        refundDue,
        orderId: booking.orderId,
      });
    });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, message: "Termin-Modul nicht verfügbar." };
    }
    log.error("admin_cancel_booking_failed", { bookingId: booking.id, error: String(e) });
    return { ok: false, message: "Stornierung fehlgeschlagen." };
  }

  await sendWorkshopBookingCancelledForBookingId(booking.id);
  return { ok: true };
}

/** Bei Terminabsage: bestätigte Buchungen stornieren, Plätze freigeben, Storno-Mails. */
export async function cancelConfirmedBookingsAfterSessionCancelled(
  sessionId: string,
): Promise<{ cancelledBookingIds: string[] }> {
  const prisma = getPrisma();
  const bookings = await prisma.workshopBooking.findMany({
    where: { sessionId, status: "confirmed" },
    select: { id: true, seatCount: true },
  });

  const cancelledIds: string[] = [];

  for (const booking of bookings) {
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.workshopBooking.updateMany({
          where: { id: booking.id, status: "confirmed" },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: "session_cancelled",
          },
        });
        if (updated.count === 0) return;

        await tx.workshopSession.updateMany({
          where: {
            id: sessionId,
            confirmedSeatCount: { gte: booking.seatCount },
          },
          data: { confirmedSeatCount: { decrement: booking.seatCount } },
        });

        await createWorkshopBookingEvent(tx, booking.id, WORKSHOP_BOOKING_EVENT_SESSION_CANCELLED, {
          sessionId,
        });
      });
      cancelledIds.push(booking.id);
    } catch (e) {
      log.error("session_cancel_booking_failed", {
        sessionId,
        bookingId: booking.id,
        error: String(e),
      });
    }
  }

  for (const id of cancelledIds) {
    await sendWorkshopBookingCancelledForBookingId(id);
  }

  return { cancelledBookingIds: cancelledIds };
}
