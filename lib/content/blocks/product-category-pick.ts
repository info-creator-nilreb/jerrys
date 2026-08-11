import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

/** Leere Kategorie/IDs im Entwurf erlaubt; Storefront-Renderer liefert dann null. */
export const productCategoryPickBlockDataSchema = z.object({
  title: optionalBlockText(120),
  mode: z.enum(["category", "productIds"]),
  categorySlug: optionalBlockText(120),
  productIds: z.array(z.string().min(1).max(40)).max(48).default([]),
  limit: z.number().int().min(1).max(48).default(12),
});

export type ProductCategoryPickBlockData = z.infer<
  typeof productCategoryPickBlockDataSchema
>;
