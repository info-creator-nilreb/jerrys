import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

export const workshopCalendarBlockDataSchema = z.object({
  showHeader: z.boolean().default(true),
  limit: z.number().int().min(1).max(48).default(12),
  emptyMessage: optionalBlockText(200),
});

export type WorkshopCalendarBlockData = z.infer<
  typeof workshopCalendarBlockDataSchema
>;
