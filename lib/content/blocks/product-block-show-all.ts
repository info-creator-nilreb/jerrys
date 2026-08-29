import { z } from "zod";
import {
  optionalBlockText,
  optionalInternalPathSchema,
} from "@/lib/content/block-data-helpers";

/** Gemeinsame Anzeige- und CTA-Felder für CMS-Produktblöcke. */
export const productBlockShowAllFieldsSchema = z.object({
  /** false = nur bestellbare Produkte im Block (Karussell/Liste). */
  showNotOrderable: z.boolean().default(true),
  showAllCta: z.boolean().default(false),
  /** Leer → Renderer nutzt „Alle anzeigen“. */
  showAllLabel: optionalBlockText(60),
  /**
   * Optionaler Zielpfad. Leer + CTA aktiv → automatisch aus Quelle
   * (Kollektion / Kategorie / Katalog).
   */
  showAllHref: optionalInternalPathSchema,
});

export type ProductBlockShowAllFields = z.infer<
  typeof productBlockShowAllFieldsSchema
>;

export function resolveProductBlockShowAllHref(options: {
  showAllCta: boolean;
  showAllHref: string | null | undefined;
  kind: "collection" | "category" | "catalog";
  collectionSlug?: string | null;
  categorySlug?: string | null;
}): string | null {
  if (!options.showAllCta) return null;
  const custom = options.showAllHref?.trim();
  if (custom) return custom;
  if (options.kind === "collection" && options.collectionSlug) {
    return `/kollektionen/${options.collectionSlug}`;
  }
  if (options.kind === "category" && options.categorySlug) {
    return `/kategorien/${options.categorySlug}`;
  }
  if (options.kind === "catalog") {
    return "/produkte";
  }
  return null;
}

export function resolveProductBlockShowAllLabel(
  label: string | null | undefined,
): string {
  const t = label?.trim();
  return t || "Alle anzeigen";
}
