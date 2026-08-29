import { z } from "zod";
import {
  COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS,
  COLLECTION_MEMBERSHIP_MANUAL,
  MAX_CREATED_WITHIN_DAYS,
  MIN_CREATED_WITHIN_DAYS,
  parseCollectionMembershipMode,
} from "@/lib/catalog/collection-membership";
import { nonEmptyString } from "@/lib/validation/form";

export const collectionSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche.");

export const collectionUpsertSchema = z.object({
  id: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v)),
    z.string().min(1).optional(),
  ),
  title: nonEmptyString,
  slug: collectionSlugSchema,
  description: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : s.slice(0, 2000)))
    .nullable()
    .optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("1")])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
  membershipMode: z
    .union([z.literal(COLLECTION_MEMBERSHIP_MANUAL), z.literal(COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS)])
    .optional()
    .transform((v) => parseCollectionMembershipMode(v)),
  ruleDays: z.preprocess(
    (v) => (v == null || v === "" ? undefined : v),
    z.coerce.number().int().min(MIN_CREATED_WITHIN_DAYS).max(MAX_CREATED_WITHIN_DAYS).optional(),
  ),
  productIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v == null) return [] as string[];
      const arr = Array.isArray(v) ? v : [v];
      return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
    }),
}).superRefine((data, ctx) => {
  if (data.membershipMode === COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS && data.ruleDays == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ruleDays"],
      message: `Bitte Anzahl Tage angeben (${MIN_CREATED_WITHIN_DAYS}–${MAX_CREATED_WITHIN_DAYS}).`,
    });
  }
  if (data.membershipMode === COLLECTION_MEMBERSHIP_MANUAL && data.ruleDays != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ruleDays"],
      message: "Tage sind nur bei automatischer Neu-Regel relevant.",
    });
  }
});
