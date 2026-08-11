import { z } from "zod";
import {
  mediaUrlSchema,
  optionalBlockText,
  optionalInternalPathSchema,
} from "@/lib/content/block-data-helpers";

export const imageTextBlockDataSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  imageUrl: mediaUrlSchema,
  imageAlt: optionalBlockText(160),
  imagePosition: z.enum(["left", "right"]).default("left"),
  ctaLabel: optionalBlockText(60),
  ctaHref: optionalInternalPathSchema,
});

export type ImageTextBlockData = z.infer<typeof imageTextBlockDataSchema>;
