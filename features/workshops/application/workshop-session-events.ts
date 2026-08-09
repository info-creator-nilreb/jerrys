import type { Prisma } from "@/app/generated/prisma/client";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { appendIntegrationOutbox } from "@/features/integrations";

export const WORKSHOP_SESSION_EVENT_CREATED = "workshop.session.created" as const;
export const WORKSHOP_SESSION_EVENT_UPDATED = "workshop.session.updated" as const;
export const WORKSHOP_SESSION_EVENT_PUBLISHED = "workshop.session.published" as const;
export const WORKSHOP_SESSION_EVENT_CANCELLED = "workshop.session.cancelled" as const;
export const WORKSHOP_SESSION_EVENT_COMPLETED = "workshop.session.completed" as const;
export const WORKSHOP_SESSION_EVENT_SETTINGS_UPDATED = "workshop.settings.updated" as const;

export async function createWorkshopSessionEvent(
  db: Pick<PrismaClient, "workshopSessionEvent" | "integrationOutboxMessage">,
  sessionId: string,
  eventType: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await db.workshopSessionEvent.create({
    data: {
      sessionId,
      eventType,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });
  await appendIntegrationOutbox(db, {
    aggregateType: "workshop_session",
    aggregateId: sessionId,
    eventType,
    payload: metadata ?? {},
  });
}
