import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { getShopWorkshopSettings } from "@/features/workshops/application/shop-workshop-settings";
import {
  computeStorefrontWorkshopSessionView,
  formatWorkshopDurationMinutes,
  storefrontWorkshopAvailabilityLabel,
  type StorefrontWorkshopAvailability,
} from "@/features/workshops/domain/storefront-session-availability";
import { resolveSelfCancelDeadline } from "@/features/workshops/domain/self-cancel-policy";

export type StorefrontWorkshopSessionListItem = {
  id: string;
  title: string;
  description: string | null;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  locationLabel: string;
  priceCentsPerSeat: number;
  currency: string;
  capacity: number;
  maxSeatsPerBooking: number | null;
  availability: StorefrontWorkshopAvailability;
  availabilityLabel: string;
  seatsRemaining: number;
  confirmedSeatCount: number;
  minimumParticipants: number;
  minimumParticipantsMet: boolean;
  durationMinutes: number;
  selfCancelHoursBeforeStart: number | null;
  globalSelfCancelHoursBeforeStart: number;
};

export type StorefrontWorkshopSessionDetail = StorefrontWorkshopSessionListItem;

function mapRow(
  row: {
    id: string;
    title: string;
    description: string | null;
    timezone: string;
    startsAt: Date;
    endsAt: Date;
    locationLabel: string;
    priceCentsPerSeat: number;
    currency: string;
    capacity: number;
    maxSeatsPerBooking: number | null;
    minimumParticipants: number;
    confirmedSeatCount: number;
    heldSeatCount: number;
    selfCancelHoursBeforeStart: number | null;
    status: string;
  },
  now: Date,
  globalSelfCancelHours: number,
): StorefrontWorkshopSessionListItem {
  const view = computeStorefrontWorkshopSessionView({
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    now,
    capacity: row.capacity,
    confirmedSeatCount: row.confirmedSeatCount,
    heldSeatCount: row.heldSeatCount,
    minimumParticipants: row.minimumParticipants,
  });

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    timezone: row.timezone,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    locationLabel: row.locationLabel,
    priceCentsPerSeat: row.priceCentsPerSeat,
    currency: row.currency,
    capacity: row.capacity,
    maxSeatsPerBooking: row.maxSeatsPerBooking,
    availability: view.availability,
    availabilityLabel: storefrontWorkshopAvailabilityLabel(view.availability),
    seatsRemaining: view.seatsRemaining,
    confirmedSeatCount: row.confirmedSeatCount,
    minimumParticipants: row.minimumParticipants,
    minimumParticipantsMet: view.minimumParticipantsMet,
    durationMinutes: formatWorkshopDurationMinutes(row.startsAt, row.endsAt),
    selfCancelHoursBeforeStart: row.selfCancelHoursBeforeStart,
    globalSelfCancelHoursBeforeStart: globalSelfCancelHours,
  };
}

const publicSessionSelect = {
  id: true,
  title: true,
  description: true,
  timezone: true,
  startsAt: true,
  endsAt: true,
  locationLabel: true,
  priceCentsPerSeat: true,
  currency: true,
  capacity: true,
  maxSeatsPerBooking: true,
  minimumParticipants: true,
  confirmedSeatCount: true,
  heldSeatCount: true,
  selfCancelHoursBeforeStart: true,
  status: true,
} as const;

/**
 * Veröffentlichte, zukünftige Termine für Storefront (Liste/Kalender/Einbettung).
 * Abgesagte/abgeschlossene Entwürfe werden nicht geliefert.
 */
export async function listPublishedWorkshopSessionsForStorefront(options?: {
  /** Nur Termine ab diesem Zeitpunkt (Default: jetzt). */
  from?: Date;
  limit?: number;
}): Promise<StorefrontWorkshopSessionListItem[]> {
  const now = options?.from ?? new Date();
  const limit = options?.limit ?? 50;

  try {
    const [settings, rows] = await Promise.all([
      getShopWorkshopSettings(),
      getPrisma().workshopSession.findMany({
        where: {
          status: "published",
          startsAt: { gte: now },
        },
        orderBy: { startsAt: "asc" },
        take: limit,
        select: publicSessionSelect,
      }),
    ]);

    return rows.map((row) => mapRow(row, now, settings.selfCancelHoursBeforeStart));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export async function getPublishedWorkshopSessionForStorefront(
  sessionId: string,
): Promise<StorefrontWorkshopSessionDetail | null> {
  const now = new Date();
  try {
    const settings = await getShopWorkshopSettings();
    const row = await getPrisma().workshopSession.findFirst({
      where: { id: sessionId, status: "published" },
      select: publicSessionSelect,
    });
    if (!row) return null;
    if (row.startsAt.getTime() < now.getTime()) return null;
    return mapRow(row, now, settings.selfCancelHoursBeforeStart);
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

export function selfCancelDeadlineForStorefrontSession(
  session: Pick<
    StorefrontWorkshopSessionListItem,
    "startsAt" | "selfCancelHoursBeforeStart" | "globalSelfCancelHoursBeforeStart"
  >,
): Date {
  return resolveSelfCancelDeadline({
    sessionStartsAt: session.startsAt,
    globalSelfCancelHoursBeforeStart: session.globalSelfCancelHoursBeforeStart,
    sessionSelfCancelHoursBeforeStart: session.selfCancelHoursBeforeStart,
  });
}
