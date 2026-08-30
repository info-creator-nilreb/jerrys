import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import {
  DEFAULT_WORKSHOP_DATE_REQUEST_SEAT_GUIDANCE,
  DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MAX_SEATS,
  DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MIN_SEATS,
  workshopDateRequestSeatGuidance,
  type WorkshopDateRequestSeatGuidance,
} from "@/lib/workshop/workshop-date-request-limits";

const DEFAULT_SELF_CANCEL_HOURS = 48;

export type ShopWorkshopSettingsView = {
  selfCancelHoursBeforeStart: number;
  dateRequestTypicalMinSeats: number;
  dateRequestTypicalMaxSeats: number;
};

const DEFAULT_SETTINGS: ShopWorkshopSettingsView = {
  selfCancelHoursBeforeStart: DEFAULT_SELF_CANCEL_HOURS,
  dateRequestTypicalMinSeats: DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MIN_SEATS,
  dateRequestTypicalMaxSeats: DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MAX_SEATS,
};

/** Shopweite Workshop-Regeln; legt bei Bedarf die Default-Zeile an. */
export async function getShopWorkshopSettings(): Promise<ShopWorkshopSettingsView> {
  const prisma = getPrisma();
  try {
    const row = await prisma.shopWorkshopSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        selfCancelHoursBeforeStart: DEFAULT_SELF_CANCEL_HOURS,
        dateRequestTypicalMinSeats: DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MIN_SEATS,
        dateRequestTypicalMaxSeats: DEFAULT_WORKSHOP_DATE_REQUEST_TYPICAL_MAX_SEATS,
      },
      update: {},
      select: {
        selfCancelHoursBeforeStart: true,
        dateRequestTypicalMinSeats: true,
        dateRequestTypicalMaxSeats: true,
      },
    });
    return {
      selfCancelHoursBeforeStart: row.selfCancelHoursBeforeStart,
      dateRequestTypicalMinSeats: row.dateRequestTypicalMinSeats,
      dateRequestTypicalMaxSeats: row.dateRequestTypicalMaxSeats,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return DEFAULT_SETTINGS;
    }
    throw e;
  }
}

export function workshopDateRequestSeatGuidanceFromSettings(
  settings: Pick<ShopWorkshopSettingsView, "dateRequestTypicalMinSeats" | "dateRequestTypicalMaxSeats">,
): WorkshopDateRequestSeatGuidance {
  return workshopDateRequestSeatGuidance(
    settings.dateRequestTypicalMinSeats,
    settings.dateRequestTypicalMaxSeats,
  );
}

export async function getWorkshopDateRequestSeatGuidance(): Promise<WorkshopDateRequestSeatGuidance> {
  try {
    const settings = await getShopWorkshopSettings();
    return workshopDateRequestSeatGuidanceFromSettings(settings);
  } catch {
    return DEFAULT_WORKSHOP_DATE_REQUEST_SEAT_GUIDANCE;
  }
}
