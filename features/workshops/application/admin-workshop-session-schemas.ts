import { z } from "zod";
import {
  parseLocalDateTimeInTimeZone,
  WORKSHOP_TIMEZONE_OPTIONS,
} from "@/lib/workshop/admin-datetime";

const timezoneValues = WORKSHOP_TIMEZONE_OPTIONS.map((o) => o.value) as [string, ...string[]];

function parseEuroToCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return 0;
  const n = Number(normalized);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

const sessionCoreSchema = z
  .object({
    title: z.string().trim().min(1, "Titel erforderlich.").max(200),
    description: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    timezone: z.enum(timezoneValues),
    startsAtLocal: z.string().trim().min(1, "Beginn erforderlich."),
    endsAtLocal: z.string().trim().min(1, "Ende erforderlich."),
    locationLabel: z.string().trim().min(1, "Ort erforderlich.").max(300),
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
  })
  .superRefine((val, ctx) => {
    const startsAt = parseLocalDateTimeInTimeZone(val.startsAtLocal, val.timezone);
    const endsAt = parseLocalDateTimeInTimeZone(val.endsAtLocal, val.timezone);
    if (!startsAt) {
      ctx.addIssue({ code: "custom", path: ["startsAtLocal"], message: "Ungültiges Beginn-Datum." });
    }
    if (!endsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAtLocal"], message: "Ungültiges End-Datum." });
    }
    if (startsAt && endsAt && endsAt <= startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAtLocal"],
        message: "Ende muss nach dem Beginn liegen.",
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
  });

export const adminWorkshopSessionUpsertSchema = sessionCoreSchema.extend({
  id: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v)),
    z.string().min(1).optional(),
  ),
});

export type AdminWorkshopSessionUpsertInput = z.infer<typeof adminWorkshopSessionUpsertSchema>;

export function adminWorkshopSessionUpsertToData(input: AdminWorkshopSessionUpsertInput) {
  const startsAt = parseLocalDateTimeInTimeZone(input.startsAtLocal, input.timezone)!;
  const endsAt = parseLocalDateTimeInTimeZone(input.endsAtLocal, input.timezone)!;
  const priceCentsPerSeat = parseEuroToCents(input.priceEuro ?? "0") ?? 0;

  return {
    title: input.title,
    description: input.description ?? null,
    timezone: input.timezone,
    startsAt,
    endsAt,
    locationLabel: input.locationLabel,
    priceCentsPerSeat,
    currency: input.currency,
    minimumParticipants: input.minimumParticipants,
    capacity: input.capacity,
    maxSeatsPerBooking: input.maxSeatsPerBooking,
    selfCancelHoursBeforeStart: input.selfCancelHoursBeforeStart,
  };
}

export const adminShopWorkshopSettingsSchema = z.object({
  selfCancelHoursBeforeStart: z.coerce
    .number()
    .int()
    .min(0, "Mindestens 0 Stunden.")
    .max(24 * 365, "Maximal ein Jahr."),
});

export { parseEuroToCents };
