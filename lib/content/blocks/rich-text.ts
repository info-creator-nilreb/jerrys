import { z } from "zod";

export const richTextBlockDataSchema = z.object({
  /** Rechtstexte können länger sein als Marketing-Absätze. */
  html: z.string().max(200_000),
});

export type RichTextBlockData = z.infer<typeof richTextBlockDataSchema>;
