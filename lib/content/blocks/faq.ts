import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const faqBlockDataSchema = z.object({
  title: optionalBlockText(120),
  items: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(200),
        answer: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

export type FaqBlockData = z.infer<typeof faqBlockDataSchema>;
