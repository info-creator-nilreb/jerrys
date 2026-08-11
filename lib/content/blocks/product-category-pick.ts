import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const productCategoryPickBlockDataSchema = z
  .object({
    title: optionalBlockText(120),
    mode: z.enum(["category", "productIds"]),
    categorySlug: optionalBlockText(120),
    productIds: z.array(z.string().min(1).max(40)).max(48).default([]),
    limit: z.number().int().min(1).max(48).default(12),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "category" && !val.categorySlug) {
      ctx.addIssue({
        code: "custom",
        path: ["categorySlug"],
        message: "Kategorie-Slug erforderlich.",
      });
    }
    if (val.mode === "productIds" && val.productIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["productIds"],
        message: "Mindestens eine Produkt-ID.",
      });
    }
  });

export type ProductCategoryPickBlockData = z.infer<
  typeof productCategoryPickBlockDataSchema
>;
