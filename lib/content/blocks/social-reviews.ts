import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const socialReviewsBlockDataSchema = z.object({
  showReviews: z.boolean().default(true),
  showSocial: z.boolean().default(true),
  titleReviews: optionalBlockText(120),
  titleSocial: optionalBlockText(120),
  introSocial: optionalBlockText(400),
});

export type SocialReviewsBlockData = z.infer<typeof socialReviewsBlockDataSchema>;
