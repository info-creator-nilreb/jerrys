import { z } from "zod";
import { parseLocalDateTimeInTimeZone } from "@/lib/workshop/admin-datetime";

const DEFAULT_TIMEZONE = "Europe/Berlin";

export const storefrontWorkshopDateRequestSchema = z
  .object({
    contactName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    contactEmail: z.string().trim().email("Gültige E-Mail erforderlich.").max(320),
    preferredStartsAtLocal: z.string().trim().min(1, "Wunschtermin erforderlich."),
    seatCount: z.coerce.number().int().min(1, "Mindestens 1 Platz.").max(50, "Maximal 50 Plätze."),
    message: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  })
  .superRefine((val, ctx) => {
    const startsAt = parseLocalDateTimeInTimeZone(val.preferredStartsAtLocal, DEFAULT_TIMEZONE);
    if (!startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["preferredStartsAtLocal"],
        message: "Ungültiges Datum oder Uhrzeit.",
      });
      return;
    }
    if (startsAt.getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["preferredStartsAtLocal"],
        message: "Der Wunschtermin muss in der Zukunft liegen.",
      });
    }
  });

export type StorefrontWorkshopDateRequestInput = z.infer<typeof storefrontWorkshopDateRequestSchema>;

export function storefrontWorkshopDateRequestToData(
  input: StorefrontWorkshopDateRequestInput,
): {
  contactName: string | undefined;
  contactEmail: string;
  preferredStartsAt: Date;
  seatCount: number;
  message: string | undefined;
} {
  const preferredStartsAt = parseLocalDateTimeInTimeZone(
    input.preferredStartsAtLocal,
    DEFAULT_TIMEZONE,
  )!;

  return {
    contactName: input.contactName,
    contactEmail: input.contactEmail.toLowerCase(),
    preferredStartsAt,
    seatCount: input.seatCount,
    message: input.message,
  };
}

export const adminRejectWorkshopDateRequestSchema = z.object({
  id: z.string().min(1),
  adminNote: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const adminApproveWorkshopDateRequestSchema = z.object({
  id: z.string().min(1),
});
