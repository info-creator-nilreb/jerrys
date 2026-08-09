import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { createLogger } from "@/lib/logging/logger";
import {
  WORKSHOP_BOOKING_EVENT_HELD,
  WORKSHOP_BOOKING_EVENT_HOLD_EXPIRED,
  WORKSHOP_BOOKING_EVENT_CONFIRMED,
  createWorkshopBookingEvent,
} from "@/features/workshops/application/workshop-booking-events";
import { formatWorkshopSessionLocationBlock } from "@/lib/workshop/workshop-location";
import { workshopSeatHoldExpiresAt } from "@/lib/workshop/workshop-hold-ttl";
import { isWorkshopSessionPubliclyListed } from "@/features/workshops/domain/session-status";

const log = createLogger("workshops.seat-holds");

export class WorkshopInsufficientSeatsError extends Error {
  readonly code = "insufficient_seats" as const;
  constructor() {
    super("insufficient_seats");
    this.name = "WorkshopInsufficientSeatsError";
  }
}

/** Gibt abgelaufene Holds frei (held → expired, Zähler). */
export async function releaseExpiredWorkshopSeatHolds(
  tx: Prisma.TransactionClient,
  sessionId?: string,
): Promise<number> {
  const now = new Date();
  const expired = await tx.workshopBooking.findMany({
    where: {
      status: "held",
      holdExpiresAt: { lt: now },
      ...(sessionId ? { sessionId } : {}),
    },
    select: { id: true, sessionId: true, seatCount: true },
  });

  for (const row of expired) {
    const updated = await tx.workshopBooking.updateMany({
      where: { id: row.id, status: "held" },
      data: { status: "expired" },
    });
    if (updated.count !== 1) continue;

    await tx.workshopSession.update({
      where: { id: row.sessionId },
      data: { heldSeatCount: { decrement: row.seatCount } },
    });

    await createWorkshopBookingEvent(tx, row.id, WORKSHOP_BOOKING_EVENT_HOLD_EXPIRED, {
      seatCount: row.seatCount,
    });
  }

  return expired.length;
}

export type CreateWorkshopSeatHoldResult =
  | { ok: true; bookingId: string }
  | { ok: false; message: string };

export async function createWorkshopSeatHoldForStorefront(input: {
  sessionId: string;
  seatCount: number;
  contactEmail?: string;
  customerId?: string | null;
}): Promise<CreateWorkshopSeatHoldResult> {
  const seatCount = input.seatCount;
  if (!Number.isInteger(seatCount) || seatCount < 1) {
    return { ok: false, message: "Mindestens 1 Platz wählen." };
  }

  const prisma = getPrisma();
  const holdExpiresAt = workshopSeatHoldExpiresAt();

  try {
    const bookingId = await prisma.$transaction(async (tx) => {
      await releaseExpiredWorkshopSeatHolds(tx, input.sessionId);

      const session = await tx.workshopSession.findUnique({
        where: { id: input.sessionId },
      });
      if (!session || !isWorkshopSessionPubliclyListed(session.status)) {
        return null;
      }
      if (session.startsAt.getTime() <= Date.now()) {
        return null;
      }

      const maxPer = session.maxSeatsPerBooking ?? session.capacity;
      if (seatCount > maxPer) {
        throw new Error("max_per_booking");
      }

      const reserved = session.confirmedSeatCount + session.heldSeatCount;
      if (reserved + seatCount > session.capacity) {
        throw new WorkshopInsufficientSeatsError();
      }

      const locationBlock = formatWorkshopSessionLocationBlock({
        locationLabel: session.locationLabel,
        locationLine1: session.locationLine1,
        locationLine2: session.locationLine2,
        locationZip: session.locationZip,
        locationCity: session.locationCity,
        locationCountry: session.locationCountry,
      });
      const locationSnapshot = [locationBlock.headline, ...locationBlock.addressLines].join(", ");

      const email =
        input.contactEmail?.trim().toLowerCase() ||
        (input.customerId
          ? (
              await tx.customer.findUnique({
                where: { id: input.customerId },
                select: { email: true },
              })
            )?.email
          : null) ||
        "pending@checkout.local";

      const booking = await tx.workshopBooking.create({
        data: {
          sessionId: session.id,
          customerId: input.customerId ?? null,
          contactEmail: email,
          seatCount,
          status: "held",
          holdExpiresAt,
          sessionTitleSnapshot: session.title,
          sessionStartsAtSnapshot: session.startsAt,
          sessionTimezoneSnapshot: session.timezone,
          sessionLocationSnapshot: locationSnapshot,
          unitPriceCentsSnapshot: session.priceCentsPerSeat,
          currencySnapshot: session.currency,
        },
      });

      const inc = await tx.workshopSession.updateMany({
        where: {
          id: session.id,
        },
        data: { heldSeatCount: { increment: seatCount } },
      });
      if (inc.count !== 1) {
        throw new WorkshopInsufficientSeatsError();
      }

      await createWorkshopBookingEvent(tx, booking.id, WORKSHOP_BOOKING_EVENT_HELD, {
        seatCount,
        holdExpiresAt: holdExpiresAt.toISOString(),
      });

      return booking.id;
    });

    if (!bookingId) {
      return { ok: false, message: "Termin ist nicht buchbar." };
    }

    log.info("workshop_seat_hold_created", { bookingId, sessionId: input.sessionId, seatCount });
    return { ok: true, bookingId };
  } catch (e) {
    if (e instanceof WorkshopInsufficientSeatsError) {
      return { ok: false, message: "Nicht genug freie Plätze für diesen Termin." };
    }
    if (e instanceof Error && e.message === "max_per_booking") {
      return { ok: false, message: "Die gewählte Platzanzahl überschreitet das Limit pro Buchung." };
    }
    if (isMissingSchemaError(e)) {
      return { ok: false, message: "Terminbuchung ist derzeit nicht verfügbar." };
    }
    throw e;
  }
}

export type WorkshopHoldCheckoutView = {
  bookingId: string;
  sessionId: string;
  seatCount: number;
  holdExpiresAt: Date;
  title: string;
  startsAt: Date;
  timezone: string;
  locationLabel: string;
  unitPriceCents: number;
  currency: string;
  lineTitle: string;
};

export async function getWorkshopHoldForCheckout(
  bookingId: string,
): Promise<WorkshopHoldCheckoutView | null> {
  const prisma = getPrisma();
  try {
    await prisma.$transaction(async (tx) => {
      await releaseExpiredWorkshopSeatHolds(tx);
    });

    const booking = await prisma.workshopBooking.findUnique({
      where: { id: bookingId },
      include: { session: { select: { id: true, locationLabel: true } } },
    });
    if (!booking || booking.status !== "held" || !booking.holdExpiresAt) {
      return null;
    }
    if (booking.holdExpiresAt.getTime() <= Date.now()) {
      return null;
    }

    const when = new Intl.DateTimeFormat("de-DE", {
      timeZone: booking.sessionTimezoneSnapshot,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(booking.sessionStartsAtSnapshot);

    return {
      bookingId: booking.id,
      sessionId: booking.sessionId,
      seatCount: booking.seatCount,
      holdExpiresAt: booking.holdExpiresAt,
      title: booking.sessionTitleSnapshot,
      startsAt: booking.sessionStartsAtSnapshot,
      timezone: booking.sessionTimezoneSnapshot,
      locationLabel: booking.session.locationLabel,
      unitPriceCents: booking.unitPriceCentsSnapshot,
      currency: booking.currencySnapshot,
      lineTitle: `${booking.sessionTitleSnapshot} · ${when}`,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

/** Nach erfolgreicher Zahlung: held → confirmed, Zähler verschieben. Idempotent. */
export async function confirmWorkshopBookingAfterOrderPaid(
  tx: Prisma.TransactionClient,
  params: { orderId: string },
): Promise<void> {
  const booking = await tx.workshopBooking.findFirst({
    where: { orderId: params.orderId },
    select: { id: true, status: true, sessionId: true, seatCount: true },
  });
  if (!booking) return;
  if (booking.status === "confirmed") return;
  if (booking.status !== "held") return;

  const updated = await tx.workshopBooking.updateMany({
    where: { id: booking.id, status: "held" },
    data: { status: "confirmed", holdExpiresAt: null },
  });
  if (updated.count !== 1) return;

  await tx.workshopSession.update({
    where: { id: booking.sessionId },
    data: {
      heldSeatCount: { decrement: booking.seatCount },
      confirmedSeatCount: { increment: booking.seatCount },
    },
  });

  await createWorkshopBookingEvent(tx, booking.id, WORKSHOP_BOOKING_EVENT_CONFIRMED, {
    orderId: params.orderId,
  });
}

/** Hold freigeben (Abbruch). */
export async function releaseWorkshopHoldForBooking(
  bookingId: string,
  reason: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const booking = await tx.workshopBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, sessionId: true, seatCount: true },
    });
    if (!booking || booking.status !== "held") return;

    const updated = await tx.workshopBooking.updateMany({
      where: { id: booking.id, status: "held" },
      data: { status: "expired", holdExpiresAt: null, cancelReason: reason },
    });
    if (updated.count !== 1) return;

    await tx.workshopSession.update({
      where: { id: booking.sessionId },
      data: { heldSeatCount: { decrement: booking.seatCount } },
    });

    await createWorkshopBookingEvent(tx, booking.id, WORKSHOP_BOOKING_EVENT_HOLD_EXPIRED, {
      reason,
    });
  });
}
