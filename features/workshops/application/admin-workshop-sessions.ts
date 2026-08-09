import type { ZodError } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { createLogger } from "@/lib/logging/logger";
import {
  adminShopWorkshopSettingsSchema,
  adminWorkshopSessionUpsertSchema,
  adminWorkshopSessionUpsertToData,
} from "@/features/workshops/application/admin-workshop-session-schemas";
import { getShopWorkshopSettings } from "@/features/workshops/application/shop-workshop-settings";
import { appendIntegrationOutbox } from "@/features/integrations";
import {
  WORKSHOP_SESSION_EVENT_CANCELLED,
  WORKSHOP_SESSION_EVENT_COMPLETED,
  WORKSHOP_SESSION_EVENT_CREATED,
  WORKSHOP_SESSION_EVENT_PUBLISHED,
  WORKSHOP_SESSION_EVENT_SETTINGS_UPDATED,
  WORKSHOP_SESSION_EVENT_UPDATED,
  createWorkshopSessionEvent,
} from "@/features/workshops/application/workshop-session-events";
import {
  WORKSHOP_SESSION_STATUSES,
  workshopSessionStatusLabel,
  type WorkshopSessionStatus,
} from "@/features/workshops/domain/session-status";

const log = createLogger("workshops.admin-sessions");

export type AdminWorkshopSessionListItem = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  locationLabel: string;
  capacity: number;
  confirmedSeatCount: number;
  heldSeatCount: number;
  minimumParticipants: number;
  priceCentsPerSeat: number;
  currency: string;
};

export type AdminWorkshopSessionDetail = AdminWorkshopSessionListItem & {
  description: string | null;
  maxSeatsPerBooking: number | null;
  selfCancelHoursBeforeStart: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MutateWorkshopSessionResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function mapListRow(row: {
  id: string;
  title: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  locationLabel: string;
  capacity: number;
  confirmedSeatCount: number;
  heldSeatCount: number;
  minimumParticipants: number;
  priceCentsPerSeat: number;
  currency: string;
}): AdminWorkshopSessionListItem {
  return {
    ...row,
    statusLabel: workshopSessionStatusLabel(row.status),
  };
}

export async function listWorkshopSessionsForAdmin(): Promise<AdminWorkshopSessionListItem[]> {
  try {
    const rows = await getPrisma().workshopSession.findMany({
      orderBy: [{ startsAt: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        timezone: true,
        locationLabel: true,
        capacity: true,
        confirmedSeatCount: true,
        heldSeatCount: true,
        minimumParticipants: true,
        priceCentsPerSeat: true,
        currency: true,
      },
    });
    return rows.map(mapListRow);
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export async function getWorkshopSessionForAdmin(
  id: string,
): Promise<AdminWorkshopSessionDetail | null> {
  try {
    const row = await getPrisma().workshopSession.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        startsAt: true,
        endsAt: true,
        timezone: true,
        locationLabel: true,
        capacity: true,
        confirmedSeatCount: true,
        heldSeatCount: true,
        minimumParticipants: true,
        maxSeatsPerBooking: true,
        selfCancelHoursBeforeStart: true,
        priceCentsPerSeat: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!row) return null;
    return { ...mapListRow(row), ...row, statusLabel: workshopSessionStatusLabel(row.status) };
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

function fieldErrorsFromZod(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key]!.push(issue.message);
  }
  return fieldErrors;
}

export async function upsertWorkshopSessionDraft(
  input: unknown,
): Promise<MutateWorkshopSessionResult> {
  const parsed = adminWorkshopSessionUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const data = adminWorkshopSessionUpsertToData(parsed.data);
  const prisma = getPrisma();

  try {
    if (parsed.data.id) {
      const existing = await prisma.workshopSession.findUnique({
        where: { id: parsed.data.id },
        select: { status: true, confirmedSeatCount: true, heldSeatCount: true },
      });
      if (!existing) {
        return { ok: false, message: "Termin nicht gefunden." };
      }
      if (existing.status !== "draft") {
        return { ok: false, message: "Nur Entwürfe können bearbeitet werden." };
      }
      if (data.capacity < existing.confirmedSeatCount + existing.heldSeatCount) {
        return {
          ok: false,
          message: "Kapazität darf unter bereits gebuchten oder reservierten Plätzen nicht liegen.",
        };
      }

      await prisma.$transaction(async (tx) => {
        await tx.workshopSession.update({
          where: { id: parsed.data.id },
          data,
        });
        await createWorkshopSessionEvent(tx, parsed.data.id!, WORKSHOP_SESSION_EVENT_UPDATED, {
          title: data.title,
        });
      });
      return { ok: true, id: parsed.data.id };
    }

    const created = await prisma.$transaction(async (tx) => {
      const session = await tx.workshopSession.create({
        data: { ...data, status: "draft" },
      });
      await createWorkshopSessionEvent(tx, session.id, WORKSHOP_SESSION_EVENT_CREATED, {
        title: session.title,
      });
      return session;
    });

    log.info("workshop_session_created", { sessionId: created.id });
    return { ok: true, id: created.id };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return {
        ok: false,
        message: "Termin-Tabellen fehlen — bitte Migration deployen (npm run db:migrate:deploy).",
      };
    }
    log.error("workshop_session_upsert_failed", { error: String(e) });
    return { ok: false, message: "Speichern fehlgeschlagen. Bitte später erneut versuchen." };
  }
}

export async function publishWorkshopSession(sessionId: string): Promise<MutateWorkshopSessionResult> {
  const prisma = getPrisma();
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.workshopSession.updateMany({
        where: { id: sessionId, status: "draft" },
        data: { status: "published" },
      });
      if (result.count === 0) return 0;
      await createWorkshopSessionEvent(tx, sessionId, WORKSHOP_SESSION_EVENT_PUBLISHED, {});
      return result.count;
    });
    if (updated === 0) {
      return { ok: false, message: "Nur Entwürfe können veröffentlicht werden." };
    }
    return { ok: true, id: sessionId };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, message: "Migration für Termine fehlt." };
    }
    return { ok: false, message: "Veröffentlichen fehlgeschlagen." };
  }
}

export async function cancelWorkshopSession(sessionId: string): Promise<MutateWorkshopSessionResult> {
  const prisma = getPrisma();
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.workshopSession.updateMany({
        where: { id: sessionId, status: "published" },
        data: { status: "cancelled" },
      });
      if (result.count === 0) return 0;
      await createWorkshopSessionEvent(tx, sessionId, WORKSHOP_SESSION_EVENT_CANCELLED, {});
      return result.count;
    });
    if (updated === 0) {
      return { ok: false, message: "Nur veröffentlichte Termine können abgesagt werden." };
    }
    return { ok: true, id: sessionId };
  } catch {
    return { ok: false, message: "Absage fehlgeschlagen." };
  }
}

export async function completeWorkshopSession(sessionId: string): Promise<MutateWorkshopSessionResult> {
  const prisma = getPrisma();
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.workshopSession.updateMany({
        where: { id: sessionId, status: { in: ["published", "cancelled"] } },
        data: { status: "completed" },
      });
      if (result.count === 0) return 0;
      await createWorkshopSessionEvent(tx, sessionId, WORKSHOP_SESSION_EVENT_COMPLETED, {});
      return result.count;
    });
    if (updated === 0) {
      return { ok: false, message: "Termin kann so nicht abgeschlossen werden." };
    }
    return { ok: true, id: sessionId };
  } catch {
    return { ok: false, message: "Abschließen fehlgeschlagen." };
  }
}

export type AdminShopWorkshopSettingsForm = {
  selfCancelHoursBeforeStart: number;
};

export async function getShopWorkshopSettingsForAdmin(): Promise<AdminShopWorkshopSettingsForm> {
  const settings = await getShopWorkshopSettings();
  return { selfCancelHoursBeforeStart: settings.selfCancelHoursBeforeStart };
}

export async function updateShopWorkshopSettings(
  input: unknown,
): Promise<{ ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string[]> }> {
  const parsed = adminShopWorkshopSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    await getPrisma().shopWorkshopSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        selfCancelHoursBeforeStart: parsed.data.selfCancelHoursBeforeStart,
      },
      update: { selfCancelHoursBeforeStart: parsed.data.selfCancelHoursBeforeStart },
    });
    await getPrisma().$transaction(async (tx) => {
      await appendIntegrationOutbox(tx, {
        aggregateType: "shop_workshop_settings",
        aggregateId: "default",
        eventType: WORKSHOP_SESSION_EVENT_SETTINGS_UPDATED,
        payload: parsed.data,
      });
    });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, message: "Workshop-Einstellungen fehlen in der Datenbank." };
    }
    return { ok: false, message: "Einstellungen konnten nicht gespeichert werden." };
  }

  return { ok: true };
}

export function isWorkshopSessionStatus(value: string): value is WorkshopSessionStatus {
  return (WORKSHOP_SESSION_STATUSES as readonly string[]).includes(value);
}
