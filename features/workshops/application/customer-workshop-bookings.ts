import { sendWorkshopBookingCancelledForBookingId } from "@/lib/email/workshop-booking-emails";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { createLogger } from "@/lib/logging/logger";
import { getVerifiedActiveCustomerId } from "@/features/customers";
import { getShopWorkshopSettings } from "@/features/workshops/application/shop-workshop-settings";
import {
  WORKSHOP_BOOKING_EVENT_ACCOUNT_ANONYMIZED,
  WORKSHOP_BOOKING_EVENT_SELF_CANCELLED,
  createWorkshopBookingEvent,
} from "@/features/workshops/application/workshop-booking-events";
import { workshopBookingStatusLabel } from "@/features/workshops/domain/booking-status";
import {
  evaluateSelfCancelPolicy,
  selfCancelPolicyUserMessage,
} from "@/features/workshops/domain/self-cancel-policy";

const log = createLogger("workshops.customer-bookings");

const SCHEMA_MISSING_MESSAGE =
  "Terminbuchungen sind im Shop noch nicht eingerichtet. Bitte später erneut versuchen.";

export type CustomerWorkshopBookingListItem = {
  id: string;
  seatCount: number;
  status: string;
  statusLabel: string;
  title: string;
  startsAt: Date;
  timezone: string;
  location: string;
  unitPriceCents: number;
  currency: string;
  canSelfCancel: boolean;
  selfCancelDeadlineAt: Date;
};

export type CustomerWorkshopBookingDetail = CustomerWorkshopBookingListItem & {
  cancelledAt: Date | null;
  contactEmail: string;
  sessionStatus: string;
  selfCancelBlockedMessage: string | null;
};

async function verifiedCustomerId(customerId: string): Promise<string | null> {
  return getVerifiedActiveCustomerId(customerId);
}

function mapRowToListItem(
  row: {
    id: string;
    seatCount: number;
    status: string;
    sessionTitleSnapshot: string;
    sessionStartsAtSnapshot: Date;
    sessionTimezoneSnapshot: string;
    sessionLocationSnapshot: string;
    unitPriceCentsSnapshot: number;
    currencySnapshot: string;
    session: { status: string; selfCancelHoursBeforeStart: number | null };
  },
  globalHours: number,
  now: Date,
): CustomerWorkshopBookingListItem {
  const policy = evaluateSelfCancelPolicy({
    now,
    sessionStartsAt: row.sessionStartsAtSnapshot,
    globalSelfCancelHoursBeforeStart: globalHours,
    sessionSelfCancelHoursBeforeStart: row.session.selfCancelHoursBeforeStart,
    bookingStatus: row.status,
    sessionStatus: row.session.status,
  });

  return {
    id: row.id,
    seatCount: row.seatCount,
    status: row.status,
    statusLabel: workshopBookingStatusLabel(row.status),
    title: row.sessionTitleSnapshot,
    startsAt: row.sessionStartsAtSnapshot,
    timezone: row.sessionTimezoneSnapshot,
    location: row.sessionLocationSnapshot,
    unitPriceCents: row.unitPriceCentsSnapshot,
    currency: row.currencySnapshot,
    canSelfCancel: policy.allowed,
    selfCancelDeadlineAt: policy.deadlineAt,
  };
}

export async function listWorkshopBookingsForCustomer(
  customerId: string,
): Promise<CustomerWorkshopBookingListItem[]> {
  const verified = await verifiedCustomerId(customerId);
  if (!verified) return [];

  try {
    const [settings, rows] = await Promise.all([
      getShopWorkshopSettings(),
      getPrisma().workshopBooking.findMany({
        where: { customerId: verified },
        orderBy: { sessionStartsAtSnapshot: "desc" },
        select: {
          id: true,
          seatCount: true,
          status: true,
          sessionTitleSnapshot: true,
          sessionStartsAtSnapshot: true,
          sessionTimezoneSnapshot: true,
          sessionLocationSnapshot: true,
          unitPriceCentsSnapshot: true,
          currencySnapshot: true,
          session: { select: { status: true, selfCancelHoursBeforeStart: true } },
        },
      }),
    ]);

    const now = new Date();
    return rows.map((row) =>
      mapRowToListItem(row, settings.selfCancelHoursBeforeStart, now),
    );
  } catch (e) {
    if (isMissingSchemaError(e)) {
      log.warn("workshop_bookings_schema_missing", { customerId: verified });
      return [];
    }
    throw e;
  }
}

export async function getWorkshopBookingForCustomer(input: {
  customerId: string;
  bookingId: string;
}): Promise<CustomerWorkshopBookingDetail | null> {
  const verified = await verifiedCustomerId(input.customerId);
  if (!verified) return null;

  try {
    const settings = await getShopWorkshopSettings();
    const row = await getPrisma().workshopBooking.findFirst({
      where: { id: input.bookingId, customerId: verified },
      select: {
        id: true,
        seatCount: true,
        status: true,
        contactEmail: true,
        cancelledAt: true,
        sessionTitleSnapshot: true,
        sessionStartsAtSnapshot: true,
        sessionTimezoneSnapshot: true,
        sessionLocationSnapshot: true,
        unitPriceCentsSnapshot: true,
        currencySnapshot: true,
        session: { select: { status: true, selfCancelHoursBeforeStart: true } },
      },
    });
    if (!row) return null;

    const now = new Date();
    const base = mapRowToListItem(row, settings.selfCancelHoursBeforeStart, now);
    const policy = evaluateSelfCancelPolicy({
      now,
      sessionStartsAt: row.sessionStartsAtSnapshot,
      globalSelfCancelHoursBeforeStart: settings.selfCancelHoursBeforeStart,
      sessionSelfCancelHoursBeforeStart: row.session.selfCancelHoursBeforeStart,
      bookingStatus: row.status,
      sessionStatus: row.session.status,
    });

    return {
      ...base,
      cancelledAt: row.cancelledAt,
      contactEmail: row.contactEmail,
      sessionStatus: row.session.status,
      selfCancelBlockedMessage: policy.allowed
        ? null
        : selfCancelPolicyUserMessage(policy),
    };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

export type SelfCancelWorkshopBookingResult =
  | { ok: true; alreadyCancelled: boolean }
  | { ok: false; message: string };

/**
 * Selbststornierung durch die Kundin/den Kunden — idempotent über `status = confirmed`
 * und rennsichere Platzfreigabe auf der Session.
 */
export async function selfCancelWorkshopBookingForCustomer(input: {
  customerId: string;
  bookingId: string;
}): Promise<SelfCancelWorkshopBookingResult> {
  const verified = await verifiedCustomerId(input.customerId);
  if (!verified) {
    return { ok: false, message: "Stornierung nur mit bestätigter E-Mail-Adresse möglich." };
  }

  const prisma = getPrisma();
  let settings: Awaited<ReturnType<typeof getShopWorkshopSettings>>;
  try {
    settings = await getShopWorkshopSettings();
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, message: SCHEMA_MISSING_MESSAGE };
    }
    throw e;
  }

  const booking = await prisma.workshopBooking.findFirst({
    where: { id: input.bookingId, customerId: verified },
    select: {
      id: true,
      status: true,
      seatCount: true,
      unitPriceCentsSnapshot: true,
      currencySnapshot: true,
      sessionId: true,
      sessionStartsAtSnapshot: true,
      session: {
        select: {
          status: true,
          selfCancelHoursBeforeStart: true,
          confirmedSeatCount: true,
        },
      },
    },
  });

  if (!booking) {
    return { ok: false, message: "Buchung nicht gefunden." };
  }

  if (booking.status === "cancelled") {
    return { ok: true, alreadyCancelled: true };
  }

  const policy = evaluateSelfCancelPolicy({
    now: new Date(),
    sessionStartsAt: booking.sessionStartsAtSnapshot,
    globalSelfCancelHoursBeforeStart: settings.selfCancelHoursBeforeStart,
    sessionSelfCancelHoursBeforeStart: booking.session.selfCancelHoursBeforeStart,
    bookingStatus: booking.status,
    sessionStatus: booking.session.status,
  });

  if (!policy.allowed) {
    return { ok: false, message: selfCancelPolicyUserMessage(policy) };
  }

  const refundDue =
    booking.unitPriceCentsSnapshot > 0 && booking.seatCount > 0;

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.workshopBooking.updateMany({
        where: { id: booking.id, customerId: verified, status: "confirmed" },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: "customer_self_cancel",
        },
      });

      if (updated.count === 0) {
        const current = await tx.workshopBooking.findUnique({
          where: { id: booking.id },
          select: { status: true },
        });
        if (current?.status === "cancelled") {
          throw new Error("already_cancelled");
        }
        throw new Error("booking_not_confirmed");
      }

      const seatRelease = await tx.workshopSession.updateMany({
        where: {
          id: booking.sessionId,
          confirmedSeatCount: { gte: booking.seatCount },
        },
        data: {
          confirmedSeatCount: { decrement: booking.seatCount },
        },
      });

      if (seatRelease.count === 0) {
        throw new Error("capacity_release_failed");
      }

      await createWorkshopBookingEvent(tx, booking.id, WORKSHOP_BOOKING_EVENT_SELF_CANCELLED, {
        seatCount: booking.seatCount,
        sessionId: booking.sessionId,
        refundDue,
        currency: booking.currencySnapshot,
        unitPriceCents: booking.unitPriceCentsSnapshot,
      });
    });
  } catch (e) {
    if (String(e).includes("already_cancelled")) {
      return { ok: true, alreadyCancelled: true };
    }
    if (String(e).includes("booking_not_confirmed")) {
      const current = await prisma.workshopBooking.findUnique({
        where: { id: booking.id },
        select: { status: true },
      });
      if (current?.status === "cancelled") {
        return { ok: true, alreadyCancelled: true };
      }
      return { ok: false, message: "Diese Buchung kann gerade nicht storniert werden." };
    }
    if (isMissingSchemaError(e)) {
      return { ok: false, message: SCHEMA_MISSING_MESSAGE };
    }
    log.error("workshop_self_cancel_failed", {
      bookingId: booking.id,
      customerId: verified,
      error: String(e),
    });
    return {
      ok: false,
      message: "Die Stornierung konnte gerade nicht durchgeführt werden. Bitte später erneut versuchen.",
    };
  }

  log.info("workshop_self_cancelled", { bookingId: booking.id, customerId: verified });
  await sendWorkshopBookingCancelledForBookingId(booking.id);
  return { ok: true, alreadyCancelled: false };
}

/**
 * Bei Konto-Löschung: bestätigte Buchungen stornieren und Plätze freigeben (ohne Fristprüfung).
 */
export async function cancelConfirmedWorkshopBookingsForAnonymizedCustomer(
  customerId: string,
): Promise<void> {
  const prisma = getPrisma();
  let bookings: {
    id: string;
    seatCount: number;
    sessionId: string;
  }[];

  try {
    bookings = await prisma.workshopBooking.findMany({
      where: { customerId, status: "confirmed" },
      select: { id: true, seatCount: true, sessionId: true },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) return;
    throw e;
  }

  for (const booking of bookings) {
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.workshopBooking.updateMany({
          where: { id: booking.id, customerId, status: "confirmed" },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: "customer_account_anonymized",
            customerId: null,
          },
        });
        if (updated.count === 0) return;

        await tx.workshopSession.updateMany({
          where: {
            id: booking.sessionId,
            confirmedSeatCount: { gte: booking.seatCount },
          },
          data: { confirmedSeatCount: { decrement: booking.seatCount } },
        });

        await createWorkshopBookingEvent(
          tx,
          booking.id,
          WORKSHOP_BOOKING_EVENT_ACCOUNT_ANONYMIZED,
          { sessionId: booking.sessionId, seatCount: booking.seatCount },
        );
      });
    } catch (e) {
      log.error("workshop_cancel_on_anonymize_failed", {
        bookingId: booking.id,
        customerId,
        error: String(e),
      });
    }
  }
}
