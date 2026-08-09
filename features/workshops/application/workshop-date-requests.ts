import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { createLogger } from "@/lib/logging/logger";
import {
  adminApproveWorkshopDateRequestSchema,
  adminRejectWorkshopDateRequestSchema,
  storefrontWorkshopDateRequestSchema,
  storefrontWorkshopDateRequestToData,
} from "@/features/workshops/application/workshop-date-request-schemas";
import {
  WORKSHOP_SESSION_EVENT_CREATED,
  createWorkshopSessionEvent,
} from "@/features/workshops/application/workshop-session-events";
import {
  isWorkshopDateRequestPending,
  workshopDateRequestStatusLabel,
} from "@/features/workshops/domain/date-request-status";
import { addWorkshopDurationMinutes } from "@/lib/workshop/admin-session-duration";
import type { ZodError } from "zod";

const log = createLogger("workshops.date-requests");
const DEFAULT_TIMEZONE = "Europe/Berlin";
const DEFAULT_DRAFT_DURATION_MINUTES = 120;

function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= [];
    out[key].push(issue.message);
  }
  return out;
}

export type StorefrontCreateWorkshopDateRequestResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function createWorkshopDateRequestForStorefront(
  input: unknown,
  options?: { customerId?: string | null },
): Promise<StorefrontCreateWorkshopDateRequestResult> {
  const parsed = storefrontWorkshopDateRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const data = storefrontWorkshopDateRequestToData(parsed.data);
  const prisma = getPrisma();

  try {
    const created = await prisma.workshopDateRequest.create({
      data: {
        customerId: options?.customerId ?? null,
        contactName: data.contactName ?? null,
        contactEmail: data.contactEmail,
        preferredStartsAt: data.preferredStartsAt,
        seatCount: data.seatCount,
        message: data.message ?? null,
        status: "pending",
      },
      select: { id: true },
    });

    log.info("workshop_date_request_created", { id: created.id });
    return { ok: true, id: created.id };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return {
        ok: false,
        message: "Terminanfragen sind derzeit nicht verfügbar. Bitte später erneut versuchen.",
      };
    }
    throw e;
  }
}

export type AdminWorkshopDateRequestListItem = {
  id: string;
  status: string;
  statusLabel: string;
  contactName: string | null;
  contactEmail: string;
  preferredStartsAt: Date;
  seatCount: number;
  message: string | null;
  adminNote: string | null;
  approvedSessionId: string | null;
  createdAt: Date;
};

export async function listWorkshopDateRequestsForAdmin(
  statusFilter?: "pending" | "all",
): Promise<AdminWorkshopDateRequestListItem[]> {
  const prisma = getPrisma();
  try {
    const rows = await prisma.workshopDateRequest.findMany({
      where: statusFilter === "pending" ? { status: "pending" } : undefined,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      statusLabel: workshopDateRequestStatusLabel(row.status),
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      preferredStartsAt: row.preferredStartsAt,
      seatCount: row.seatCount,
      message: row.message,
      adminNote: row.adminNote,
      approvedSessionId: row.approvedSessionId,
      createdAt: row.createdAt,
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export async function countPendingWorkshopDateRequestsForAdmin(): Promise<number> {
  const prisma = getPrisma();
  try {
    return await prisma.workshopDateRequest.count({ where: { status: "pending" } });
  } catch (e) {
    if (isMissingSchemaError(e)) return 0;
    throw e;
  }
}

export type MutateWorkshopDateRequestResult =
  | { ok: true; sessionId?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function rejectWorkshopDateRequestForAdmin(
  input: unknown,
): Promise<MutateWorkshopDateRequestResult> {
  const parsed = adminRejectWorkshopDateRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Ungültige Anfrage.", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const prisma = getPrisma();
  try {
    const existing = await prisma.workshopDateRequest.findUnique({
      where: { id: parsed.data.id },
      select: { status: true },
    });
    if (!existing) {
      return { ok: false, message: "Anfrage nicht gefunden." };
    }
    if (!isWorkshopDateRequestPending(existing.status)) {
      return { ok: false, message: "Diese Anfrage wurde bereits bearbeitet." };
    }

    await prisma.workshopDateRequest.update({
      where: { id: parsed.data.id },
      data: {
        status: "rejected",
        adminNote: parsed.data.adminNote ?? null,
        resolvedAt: new Date(),
      },
    });

    log.info("workshop_date_request_rejected", { id: parsed.data.id });
    return { ok: true };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, message: "Termin-Modul in der Datenbank nicht verfügbar." };
    }
    throw e;
  }
}

export async function approveWorkshopDateRequestForAdmin(
  input: unknown,
): Promise<MutateWorkshopDateRequestResult> {
  const parsed = adminApproveWorkshopDateRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Ungültige Anfrage.", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const prisma = getPrisma();
  try {
    const request = await prisma.workshopDateRequest.findUnique({
      where: { id: parsed.data.id },
    });
    if (!request) {
      return { ok: false, message: "Anfrage nicht gefunden." };
    }
    if (!isWorkshopDateRequestPending(request.status)) {
      return { ok: false, message: "Diese Anfrage wurde bereits bearbeitet." };
    }

    const startsAt = request.preferredStartsAt;
    const endsAt = addWorkshopDurationMinutes(startsAt, DEFAULT_DRAFT_DURATION_MINUTES);
    const capacity = Math.max(request.seatCount, 10);
    const titleBase = request.contactName?.trim() || "Workshop";
    const title = `Wunschtermin — ${titleBase}`;

    const sessionId = await prisma.$transaction(async (tx) => {
      const session = await tx.workshopSession.create({
        data: {
          title,
          description: request.message,
          timezone: DEFAULT_TIMEZONE,
          startsAt,
          endsAt,
          locationLabel: "Noch festlegen",
          locationLine1: "—",
          locationZip: "00000",
          locationCity: "—",
          locationCountry: "DE",
          priceCentsPerSeat: 0,
          currency: "EUR",
          minimumParticipants: 1,
          capacity,
          maxSeatsPerBooking: request.seatCount,
          status: "draft",
          confirmedSeatCount: 0,
          heldSeatCount: 0,
        },
      });

      await createWorkshopSessionEvent(tx, session.id, WORKSHOP_SESSION_EVENT_CREATED, {
        title: session.title,
        fromDateRequestId: request.id,
        contactEmail: request.contactEmail,
      });

      await tx.workshopDateRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          approvedSessionId: session.id,
          resolvedAt: new Date(),
        },
      });

      return session.id;
    });

    log.info("workshop_date_request_approved", { id: request.id, sessionId });
    return { ok: true, sessionId };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, message: "Termin-Modul in der Datenbank nicht verfügbar." };
    }
    throw e;
  }
}
