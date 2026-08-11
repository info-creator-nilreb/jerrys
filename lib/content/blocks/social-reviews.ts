import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const socialReviewsBlockDataSchema = z.object({
  showReviews: z.boolean().default(true),
  showSocial: z.boolean().default(true),
  titleReviews: optionalBlockText(120),
  titleSocial: optionalBlockText(120),
  introSocial: optionalBlockText(400),
  /** auto = Instagram-Cache wenn vorhanden, sonst kuratierte Marketing-Bilder. */
  socialSource: z.enum(["auto", "instagram", "curated"]).default("auto"),
  socialLimit: z.number().int().min(1).max(24).default(12),
});

export type SocialReviewsBlockData = z.infer<typeof socialReviewsBlockDataSchema>;
