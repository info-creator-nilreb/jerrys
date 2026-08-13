import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";
import { productBlockShowAllFieldsSchema } from "@/lib/content/blocks/product-block-show-all";

/** Leere Kategorie/Kollektion/IDs im Entwurf erlaubt; Storefront-Renderer liefert dann null. */
export const productCategoryPickBlockDataSchema = z.object({
  title: optionalBlockText(120),
  mode: z.enum(["category", "collection", "productIds"]),
  categorySlug: optionalBlockText(120),
  collectionSlug: optionalBlockText(120),
  productIds: z.array(z.string().min(1).max(40)).max(48).default([]),
  limit: z.number().int().min(1).max(48).default(12),
  ...productBlockShowAllFieldsSchema.shape,
});

export type ProductCategoryPickBlockData = z.infer<
  typeof productCategoryPickBlockDataSchema
>;
