import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const SOCIAL_DESKTOP_COLUMNS_MIN = 2;
export const SOCIAL_DESKTOP_COLUMNS_MAX = 6;
export const SOCIAL_DESKTOP_COLUMNS_DEFAULT = 4;
export const SOCIAL_DESKTOP_ROWS_MIN = 1;
export const SOCIAL_DESKTOP_ROWS_MAX = 4;
export const SOCIAL_DESKTOP_ROWS_DEFAULT = 2;
export const SOCIAL_FEED_DISPLAY_MAX = 24;

export type SocialReviewsLayout = {
  socialDesktopColumns: number;
  socialDesktopRows: number;
  socialLimit: number;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function socialFeedDisplayLimit(columns: number, rows: number): number {
  return Math.min(SOCIAL_FEED_DISPLAY_MAX, Math.max(1, columns * rows));
}

/**
 * Ergänzt fehlende Raster-Felder. Legacy-Blöcke mit nur `socialLimit`
 * werden auf 4 Spalten und so viele Zeilen wie nötig (1–4) abgebildet.
 */
export function migrateSocialReviewsInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const next = { ...(input as Record<string, unknown>) };
  const columns = asInt(next.socialDesktopColumns);
  const rows = asInt(next.socialDesktopRows);
  const limit = asInt(next.socialLimit);

  if (columns != null) next.socialDesktopColumns = columns;
  if (rows != null) next.socialDesktopRows = rows;

  if (columns == null && rows == null && limit != null) {
    next.socialDesktopColumns = SOCIAL_DESKTOP_COLUMNS_DEFAULT;
    next.socialDesktopRows = clampInt(
      Math.ceil(limit / SOCIAL_DESKTOP_COLUMNS_DEFAULT),
      SOCIAL_DESKTOP_ROWS_MIN,
      SOCIAL_DESKTOP_ROWS_MAX,
    );
  }

  return next;
}

export function resolveSocialReviewsLayout(input: unknown): SocialReviewsLayout {
  const migrated = migrateSocialReviewsInput(input);
  const parsed = socialReviewsFieldsSchema.safeParse(migrated);
  if (parsed.success) {
    return {
      socialDesktopColumns: parsed.data.socialDesktopColumns,
      socialDesktopRows: parsed.data.socialDesktopRows,
      socialLimit: socialFeedDisplayLimit(
        parsed.data.socialDesktopColumns,
        parsed.data.socialDesktopRows,
      ),
    };
  }
  return {
    socialDesktopColumns: SOCIAL_DESKTOP_COLUMNS_DEFAULT,
    socialDesktopRows: SOCIAL_DESKTOP_ROWS_DEFAULT,
    socialLimit: socialFeedDisplayLimit(
      SOCIAL_DESKTOP_COLUMNS_DEFAULT,
      SOCIAL_DESKTOP_ROWS_DEFAULT,
    ),
  };
}

const socialReviewsFieldsSchema = z.object({
  showReviews: z.boolean().default(true),
  showSocial: z.boolean().default(true),
  titleReviews: optionalBlockText(120),
  titleSocial: optionalBlockText(120),
  introSocial: optionalBlockText(400),
  /** auto = Instagram-Cache wenn vorhanden, sonst kuratierte Marketing-Bilder. */
  socialSource: z.enum(["auto", "instagram", "curated"]).default("auto"),
  socialDesktopColumns: z
    .number()
    .int()
    .min(SOCIAL_DESKTOP_COLUMNS_MIN)
    .max(SOCIAL_DESKTOP_COLUMNS_MAX)
    .default(SOCIAL_DESKTOP_COLUMNS_DEFAULT),
  socialDesktopRows: z
    .number()
    .int()
    .min(SOCIAL_DESKTOP_ROWS_MIN)
    .max(SOCIAL_DESKTOP_ROWS_MAX)
    .default(SOCIAL_DESKTOP_ROWS_DEFAULT),
});

export const socialReviewsBlockDataSchema = z.preprocess(
  migrateSocialReviewsInput,
  socialReviewsFieldsSchema.transform((data) => ({
    ...data,
    socialLimit: socialFeedDisplayLimit(
      data.socialDesktopColumns,
      data.socialDesktopRows,
    ),
  })),
);

export type SocialReviewsBlockData = z.infer<typeof socialReviewsBlockDataSchema>;

export function socialFeedDesktopGridClass(columns: number): string {
  switch (clampInt(columns, SOCIAL_DESKTOP_COLUMNS_MIN, SOCIAL_DESKTOP_COLUMNS_MAX)) {
    case 2:
      return "md:grid-cols-2";
    case 3:
      return "md:grid-cols-3";
    case 5:
      return "md:grid-cols-5";
    case 6:
      return "md:grid-cols-6";
    default:
      return "md:grid-cols-4";
  }
}
