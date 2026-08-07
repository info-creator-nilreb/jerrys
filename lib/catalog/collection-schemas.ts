import { z } from "zod";
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
  productIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v == null) return [] as string[];
      const arr = Array.isArray(v) ? v : [v];
      return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
    }),
});
