import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const curatedProductListBlockDataSchema = z.object({
  title: optionalBlockText(120),
  /** Leer erlaubt (Admin-Entwurf); Renderer zeigt dann nichts. */
  productIds: z.array(z.string().min(1).max(40)).max(48).default([]),
  limit: z.number().int().min(1).max(48).default(12),
});

export type CuratedProductListBlockData = z.infer<
  typeof curatedProductListBlockDataSchema
>;
