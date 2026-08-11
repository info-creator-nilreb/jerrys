import { z } from "zod";
import { isContentBlockType } from "@/lib/content/block-types";
import {
  CONTENT_PAGE_HOME_SLUG,
  isReservedContentSlug,
  normalizeContentSlug,
} from "@/lib/content/reserved-slugs";
import { nonEmptyString } from "@/lib/validation/form";

function emptyToNull(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? null : t;
}

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable());

const optionalHttpsOrPath = z.preprocess(emptyToNull, z
  .string()
  .max(500)
  .refine(
    (u) => u.startsWith("https://") || u.startsWith("/"),
    "Nur HTTPS-URL oder Pfad ab /.",
  )
  .nullable());

export const contentPageTypeSchema = z.enum(["homepage", "content", "legal"]);
export const contentPageStatusSchema = z.enum(["draft", "published"]);

const slugSchema = z
  .string()
  .trim()
  .transform(normalizeContentSlug)
  .refine((s) => s.length >= 1 && s.length <= 120, "Slug 1–120 Zeichen.")
  .refine(
    (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(s),
    "Slug: Kleinbuchstaben, Ziffern, Bindestriche; optional ein Segment-Pfad.",
  )
  .refine((s) => !isReservedContentSlug(s), "Slug ist ein reservierter Systempfad.");

/**
 * Validierung für ContentPage-Metadaten (Slice 1).
 * Block-Payloads: Slice 2. Keine freie CSS/JS.
 */
export const contentPageValuesSchema = z
  .object({
    slug: slugSchema,
    pageType: contentPageTypeSchema,
    status: contentPageStatusSchema.default("draft"),
    title: nonEmptyString.max(160),
    seoTitle: optionalText(70),
    seoDescription: optionalText(320),
    ogImageUrl: optionalHttpsOrPath,
    canonicalPath: z.preprocess(
      emptyToNull,
      z
        .string()
        .max(200)
        .refine((p) => p.startsWith("/"), "Canonical mit führendem /.")
        .nullable(),
    ),
    robotsIndex: z.boolean().default(true),
    previousSlug: z.preprocess(
      emptyToNull,
      z.union([slugSchema, z.null()]).optional(),
    ),
  })
  .transform((val) => ({
    ...val,
    previousSlug: val.previousSlug ?? null,
  }))
  .superRefine((val, ctx) => {
    if (val.pageType === "homepage" && val.slug !== CONTENT_PAGE_HOME_SLUG) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: `Startseite muss den Slug „${CONTENT_PAGE_HOME_SLUG}“ verwenden.`,
      });
    }
    if (val.pageType !== "homepage" && val.slug === CONTENT_PAGE_HOME_SLUG) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: `Slug „${CONTENT_PAGE_HOME_SLUG}“ ist der Startseite vorbehalten.`,
      });
    }
  });

export type ContentPageValues = z.infer<typeof contentPageValuesSchema>;

export function parseContentPageValues(raw: unknown) {
  return contentPageValuesSchema.safeParse(raw);
}

/** Leichte Block-Hülle; Typ muss Registry-Key sein, `data` erst in Slice 2 streng. */
export const contentBlockShellSchema = z.object({
  type: z
    .string()
    .trim()
    .refine(isContentBlockType, "Unbekannter Block-Typ."),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type ContentBlockShell = z.infer<typeof contentBlockShellSchema>;

export function parseContentBlockShell(raw: unknown) {
  return contentBlockShellSchema.safeParse(raw);
}
