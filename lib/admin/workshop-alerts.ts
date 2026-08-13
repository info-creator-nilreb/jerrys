import { WORKSHOP_BOOKING_EVENT_CONFIRMED } from "@/features/workshops/application/workshop-booking-events";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

export type AdminNewWorkshopBookingAlert = {
  id: string;
  bookingId: string;
  sessionId: string;
  contactEmail: string;
  seatCount: number;
  sessionTitle: string;
  sessionStartsAt: string;
  unitPriceCents: number;
  currency: string;
  confirmedAt: string;
};

export type AdminNewWorkshopDateRequestAlert = {
  id: string;
  contactEmail: string;
  contactName: string | null;
  seatCount: number;
  preferredStartsAt: string;
  createdAt: string;
};

/**
 * Neu bestätigte Terminbuchungen seit `since` (über Booking-Event, nicht nur createdAt —
 * damit Hold→Confirm nach Zahlung ebenfalls erscheint).
 */
export async function listWorkshopBookingsConfirmedAfter(
  since: Date,
): Promise<AdminNewWorkshopBookingAlert[]> {
  try {
    const rows = await getPrisma().workshopBookingEvent.findMany({
      where: {
        eventType: WORKSHOP_BOOKING_EVENT_CONFIRMED,
        createdAt: { gt: since },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        createdAt: true,
        booking: {
          select: {
            id: true,
            sessionId: true,
            contactEmail: true,
            seatCount: true,
            sessionTitleSnapshot: true,
            sessionStartsAtSnapshot: true,
            unitPriceCentsSnapshot: true,
            currencySnapshot: true,
            status: true,
          },
        },
      },
    });

    return rows
      .filter((row) => row.booking.status !== "cancelled" && row.booking.status !== "expired")
      .map((row) => ({
        id: row.id,
        bookingId: row.booking.id,
        sessionId: row.booking.sessionId,
        contactEmail: row.booking.contactEmail,
        seatCount: row.booking.seatCount,
        sessionTitle: row.booking.sessionTitleSnapshot,
        sessionStartsAt: row.booking.sessionStartsAtSnapshot.toISOString(),
        unitPriceCents: row.booking.unitPriceCentsSnapshot,
        currency: row.booking.currencySnapshot,
        confirmedAt: row.createdAt.toISOString(),
      }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

/** Neue offene Wunschtermine seit `since`. */
export async function listWorkshopDateRequestsCreatedAfter(
  since: Date,
): Promise<AdminNewWorkshopDateRequestAlert[]> {
  try {
    const rows = await getPrisma().workshopDateRequest.findMany({
      where: {
        status: "pending",
        createdAt: { gt: since },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        contactEmail: true,
        contactName: true,
        seatCount: true,
        preferredStartsAt: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      contactEmail: row.contactEmail,
      contactName: row.contactName,
      seatCount: row.seatCount,
      preferredStartsAt: row.preferredStartsAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}
