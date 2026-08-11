import { z } from "zod";
import { optionalBlockText } from "@/lib/content/block-data-helpers";

/**
 * CMS-Block „Termin-Kalender“ (Epic 12 Slice 7).
 * Rendert dieselbe `WorkshopSessionList` wie `/termine` und PDP — keine zweite Buchungslogik.
 */
export const workshopCalendarBlockDataSchema = z.object({
  /** Leer = Standardtitel „Kommende Termine“. */
  title: optionalBlockText(120),
  intro: optionalBlockText(400),
  showHeader: z.boolean().default(true),
  limit: z.number().int().min(1).max(48).default(12),
  emptyMessage: optionalBlockText(200),
  /** Link zum Wunschtermin-Formular im leeren Zustand. */
  showDateRequestLink: z.boolean().default(true),
});

export type WorkshopCalendarBlockData = z.infer<
  typeof workshopCalendarBlockDataSchema
>;
