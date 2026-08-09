import type { Prisma } from "@/app/generated/prisma/client";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { appendIntegrationOutbox } from "@/features/integrations";

export const WORKSHOP_BOOKING_EVENT_SELF_CANCELLED = "workshop.booking.self_cancelled" as const;
export const WORKSHOP_BOOKING_EVENT_ACCOUNT_ANONYMIZED =
  "workshop.booking.cancelled_account_anonymized" as const;

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
