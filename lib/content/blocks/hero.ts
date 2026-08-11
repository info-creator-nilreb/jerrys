import { z } from "zod";
import {
  mediaUrlSchema,
  optionalBlockText,
  optionalInternalPathSchema,
} from "@/lib/content/block-data-helpers";

export const heroBlockDataSchema = z.object({
  eyebrow: optionalBlockText(80),
  headline: z.string().trim().min(1).max(120),
  imageUrl: mediaUrlSchema,
  imageAlt: optionalBlockText(160),
  ctaLabel: optionalBlockText(60),
  ctaHref: optionalInternalPathSchema,
});

export type HeroBlockData = z.infer<typeof heroBlockDataSchema>;
