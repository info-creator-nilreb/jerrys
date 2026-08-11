import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const uspStripBlockDataSchema = z.object({
  title: optionalBlockText(120),
  intro: optionalBlockText(500),
  items: z
    .array(
      z.object({
        icon: z.enum(["design", "germany", "heart"]),
        title: z.string().trim().min(1).max(80),
        body: z.string().trim().min(1).max(400),
      }),
    )
    .min(1)
    .max(6),
});

export type UspStripBlockData = z.infer<typeof uspStripBlockDataSchema>;
