import { z } from "zod";
import { WORKSHOP_DATE_REQUEST_MAX_SEATS } from "@/lib/workshop/workshop-date-request-limits";
import {
  addWorkshopDurationMinutes,
  snapWorkshopSessionDurationMinutes,
  WORKSHOP_SESSION_DURATION_MAX_MINUTES,
  WORKSHOP_SESSION_DURATION_MIN_MINUTES,
  WORKSHOP_SESSION_DURATION_STEP_MINUTES,
} from "@/lib/workshop/admin-session-duration";
import {
  parseLocalDateTimeInTimeZone,
  WORKSHOP_TIMEZONE_OPTIONS,
} from "@/lib/workshop/admin-datetime";
import { WORKSHOP_SESSION_SERIES_MAX_DATES } from "@/lib/workshop/workshop-series";

const timezoneValues = WORKSHOP_TIMEZONE_OPTIONS.map((o) => o.value) as [string, ...string[]];

function parseEuroToCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return 0;
  const n = Number(normalized);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Gemeinsame Termin-Vorlage (ohne Beginn). */
export const adminWorkshopSessionTemplateSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich.").max(200),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  timezone: z.enum(timezoneValues),
  durationMinutes: z.coerce
    .number()
    .int("Dauer in Minuten erforderlich.")
    .min(WORKSHOP_SESSION_DURATION_MIN_MINUTES, "Mindestens 30 Minuten.")
    .max(WORKSHOP_SESSION_DURATION_MAX_MINUTES, "Maximal 8 Stunden."),
  locationLabel: z.string().trim().min(1, "Ort erforderlich.").max(300),
  locationLine1: z.string().trim().min(1, "Straße und Hausnummer erforderlich.").max(200),
  locationLine2: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  locationZip: z.string().trim().min(1, "PLZ erforderlich.").max(20),
  locationCity: z.string().trim().min(1, "Ort/Stadt erforderlich.").max(120),
  locationCountry: z.enum(["DE", "AT", "CH"]).default("DE"),
  priceEuro: z.string().trim().optional(),
  currency: z.literal("EUR").default("EUR"),
  minimumParticipants: z.coerce.number().int().min(1, "Mindestens 1."),
  capacity: z.coerce.number().int().min(1, "Kapazität mindestens 1."),
  maxSeatsPerBooking: z
    .preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().int().min(1).optional(),
    )
    .transform((v) => v ?? null),
  selfCancelHoursBeforeStart: z
    .preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().int().min(0).optional(),
    )
    .transform((v) => v ?? null),
});

export type AdminWorkshopSessionTemplateInput = z.infer<typeof adminWorkshopSessionTemplateSchema>;

function refineWorkshopSessionTemplate(
  val: AdminWorkshopSessionTemplateInput,
  ctx: z.RefinementCtx,
): void {
  if (val.durationMinutes % WORKSHOP_SESSION_DURATION_STEP_MINUTES !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["durationMinutes"],
      message: "Dauer in 30-Minuten-Schritten wählen.",
    });
  }
  if (val.capacity < val.minimumParticipants) {
    ctx.addIssue({
      code: "custom",
      path: ["capacity"],
      message: "Kapazität darf nicht unter der Mindestteilnehmerzahl liegen.",
    });
  }
  if (val.maxSeatsPerBooking != null && val.maxSeatsPerBooking > val.capacity) {
    ctx.addIssue({
      code: "custom",
      path: ["maxSeatsPerBooking"],
      message: "Max. Plätze pro Buchung darf die Kapazität nicht überschreiten.",
    });
  }
  const cents = parseEuroToCents(val.priceEuro ?? "0");
  if (cents === null) {
    ctx.addIssue({ code: "custom", path: ["priceEuro"], message: "Ungültiger Preis." });
  }
}

const sessionCoreSchema = adminWorkshopSessionTemplateSchema
  .extend({
    startsAtLocal: z.string().trim().min(1, "Beginn erforderlich."),
  })
  .superRefine((val, ctx) => {
    refineWorkshopSessionTemplate(val, ctx);
    const startsAt = parseLocalDateTimeInTimeZone(val.startsAtLocal, val.timezone);
    if (!startsAt) {
      ctx.addIssue({ code: "custom", path: ["startsAtLocal"], message: "Ungültiges Beginn-Datum." });
    }
  });

export const adminWorkshopSessionUpsertSchema = sessionCoreSchema.extend({
  id: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v)),
    z.string().min(1).optional(),
  ),
});

export type AdminWorkshopSessionUpsertInput = z.infer<typeof adminWorkshopSessionUpsertSchema>;

export const adminWorkshopSessionSeriesSchema = adminWorkshopSessionTemplateSchema
  .extend({
    seriesStartsAtLocal: z.preprocess(
      (v) => {
        if (Array.isArray(v)) return v.filter((x) => String(x).trim() !== "");
        if (typeof v === "string" && v.trim()) return [v.trim()];
        return [];
      },
      z
        .array(z.string().trim().min(1))
        .min(1, "Mindestens ein Termin-Datum.")
        .max(WORKSHOP_SESSION_SERIES_MAX_DATES, `Maximal ${WORKSHOP_SESSION_SERIES_MAX_DATES} Termine.`),
    ),
  })
  .superRefine((val, ctx) => {
    refineWorkshopSessionTemplate(val, ctx);
    const seen = new Set<string>();
    val.seriesStartsAtLocal.forEach((local, index) => {
      const startsAt = parseLocalDateTimeInTimeZone(local, val.timezone);
      if (!startsAt) {
        ctx.addIssue({
          code: "custom",
          path: ["seriesStartsAtLocal", index],
          message: "Ungültiges Datum.",
        });
        return;
      }
      const key = startsAt.toISOString();
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["seriesStartsAtLocal", index],
          message: "Doppeltes Datum in der Serie.",
        });
      }
      seen.add(key);
    });
  });

export type AdminWorkshopSessionSeriesInput = z.infer<typeof adminWorkshopSessionSeriesSchema>;

export function adminWorkshopSessionTemplateToSessionData(
  template: AdminWorkshopSessionTemplateInput,
  startsAtLocal: string,
) {
  return adminWorkshopSessionUpsertToData({
    ...template,
    startsAtLocal,
  });
}

export function adminWorkshopSessionUpsertToData(input: AdminWorkshopSessionUpsertInput) {
  const startsAt = parseLocalDateTimeInTimeZone(input.startsAtLocal, input.timezone)!;
  const durationMinutes = snapWorkshopSessionDurationMinutes(input.durationMinutes);
  const endsAt = addWorkshopDurationMinutes(startsAt, durationMinutes);
  const priceCentsPerSeat = parseEuroToCents(input.priceEuro ?? "0") ?? 0;

  return {
    title: input.title,
    description: input.description ?? null,
    timezone: input.timezone,
    startsAt,
    endsAt,
    locationLabel: input.locationLabel,
    locationLine1: input.locationLine1,
    locationLine2: input.locationLine2 ?? null,
    locationZip: input.locationZip,
    locationCity: input.locationCity,
    locationCountry: input.locationCountry,
    priceCentsPerSeat,
    currency: input.currency,
    minimumParticipants: input.minimumParticipants,
    capacity: input.capacity,
    maxSeatsPerBooking: input.maxSeatsPerBooking,
    selfCancelHoursBeforeStart: input.selfCancelHoursBeforeStart,
  };
}

export const adminShopWorkshopSettingsSchema = z
  .object({
    selfCancelHoursBeforeStart: z.coerce
      .number()
      .int()
      .min(0, "Mindestens 0 Stunden.")
      .max(24 * 365, "Maximal ein Jahr."),
    dateRequestTypicalMinSeats: z.coerce
      .number()
      .int()
      .min(1, "Mindestens 1 Person.")
      .max(WORKSHOP_DATE_REQUEST_MAX_SEATS, `Maximal ${WORKSHOP_DATE_REQUEST_MAX_SEATS} Personen.`),
    dateRequestTypicalMaxSeats: z.coerce
      .number()
      .int()
      .min(1, "Mindestens 1 Person.")
      .max(WORKSHOP_DATE_REQUEST_MAX_SEATS, `Maximal ${WORKSHOP_DATE_REQUEST_MAX_SEATS} Personen.`),
  })
  .superRefine((val, ctx) => {
    if (val.dateRequestTypicalMaxSeats < val.dateRequestTypicalMinSeats) {
      ctx.addIssue({
        code: "custom",
        path: ["dateRequestTypicalMaxSeats"],
        message: "Maximum darf nicht unter dem Minimum liegen.",
      });
    }
  });

export { parseEuroToCents };
