import type { PromotionDisplayStatus } from "@/lib/promotions/types";

/**
 * Statuslogik: Entwurf vs. Deaktiviert über `publishedOnce` (einmal aktiviert/gespeichert als aktiv).
 */
export function derivePromotionDisplayStatus(
  input: {
    isEnabled: boolean;
    publishedOnce: boolean;
    startDate: Date;
    endDate: Date;
  },
  now: Date = new Date(),
): PromotionDisplayStatus {
  if (now > input.endDate) {
    return "abgelaufen";
  }
  if (!input.isEnabled) {
    if (!input.publishedOnce) {
      return "entwurf";
    }
    return "deaktiviert";
  }
  if (now < input.startDate) {
    return "geplant";
  }
  return "aktiv";
}
