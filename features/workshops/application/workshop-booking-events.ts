import type { Prisma } from "@/app/generated/prisma/client";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { appendIntegrationOutbox } from "@/features/integrations";

export const WORKSHOP_BOOKING_EVENT_SELF_CANCELLED = "workshop.booking.self_cancelled" as const;
export const WORKSHOP_BOOKING_EVENT_ACCOUNT_ANONYMIZED =
  "workshop.booking.cancelled_account_anonymized" as const;
export const WORKSHOP_BOOKING_EVENT_HELD = "workshop.booking.held" as const;
export const WORKSHOP_BOOKING_EVENT_HOLD_EXPIRED = "workshop.booking.hold_expired" as const;
export const WORKSHOP_BOOKING_EVENT_CONFIRMED = "workshop.booking.confirmed" as const;
export const WORKSHOP_BOOKING_EVENT_ADMIN_CANCELLED = "workshop.booking.admin_cancelled" as const;
export const WORKSHOP_BOOKING_EVENT_SESSION_CANCELLED = "workshop.booking.session_cancelled" as const;
export const WORKSHOP_BOOKING_EVENT_ATTENDANCE_UPDATED = "workshop.booking.attendance_updated" as const;

export async function createWorkshopBookingEvent(
  db: Pick<PrismaClient, "workshopBookingEvent" | "integrationOutboxMessage">,
  bookingId: string,
  eventType: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await db.workshopBookingEvent.create({
    data: {
      bookingId,
      eventType,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });
  await appendIntegrationOutbox(db, {
    aggregateType: "workshop_booking",
    aggregateId: bookingId,
    eventType,
    payload: metadata ?? {},
  });
}
