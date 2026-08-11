import { z } from "zod";

export const richTextBlockDataSchema = z.object({
  html: z.string().max(50_000),
});

export type RichTextBlockData = z.infer<typeof richTextBlockDataSchema>;
