import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";
import { productBlockShowAllFieldsSchema } from "@/lib/content/blocks/product-block-show-all";

export const curatedProductListBlockDataSchema = z.object({
  title: optionalBlockText(120),
  /** `allActive` = Katalog; `collection` = Kollektion; sonst kuratierte IDs. */
  source: z.enum(["ids", "allActive", "collection"]).default("ids"),
  /** Leer erlaubt (Admin-Entwurf); Renderer zeigt dann nichts (außer allActive). */
  productIds: z.array(z.string().min(1).max(40)).max(48).default([]),
  collectionSlug: optionalBlockText(120),
  limit: z.number().int().min(1).max(48).default(12),
  ...productBlockShowAllFieldsSchema.shape,
});

export type CuratedProductListBlockData = z.infer<
  typeof curatedProductListBlockDataSchema
>;
