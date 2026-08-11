import { z } from "zod";

export const uspStripBlockDataSchema = z.object({
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
