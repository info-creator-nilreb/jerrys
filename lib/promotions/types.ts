import type { Promotion as PromotionRow } from "@/app/generated/prisma/client";

export type PromotionRecord = PromotionRow;

/** Admin / API: abgeleiteter Anzeigestatus */
export type PromotionDisplayStatus =
  | "entwurf"
  | "geplant"
  | "aktiv"
  | "abgelaufen"
  | "deaktiviert";

export const PROMOTION_TYPES = {
  order_discount: "Betrag oder Prozent auf Bestellung",
  free_shipping: "Versandkostenfrei",
} as const;

export type PromotionTypeId = keyof typeof PROMOTION_TYPES;

export const PROMOTION_TYPE_DESCRIPTIONS: Record<PromotionTypeId, string> = {
  order_discount: "Prozentualer oder fester Rabatt auf die Warenwert-Summe",
  free_shipping: "Versandkosten entfallen, sobald die Promotion greift",
};

export type ApplicationMode = "automatic" | "code";

export type DiscountValueType = "percent" | "fixed";

export type MinimumRequirementType = "none" | "cart_value";

export type PromotionValidationReason =
  | "CODE_NOT_FOUND"
  | "CODE_DEACTIVATED"
  | "NOT_YET_ACTIVE"
  | "EXPIRED"
  | "MIN_CART_NOT_MET"
  | "WRONG_APPLICATION_MODE";

export type ResolvedCheckoutPromotion =
  | {
      kind: "none";
    }
  | {
      kind: "applied";
      promotionId: string;
      title: string;
      code: string | null;
      source: "code" | "automatic";
      promotionType: "order_discount" | "free_shipping";
      /** Warenrabatt (Cent). */
      discountOffSubtotalCents: number;
      /** Ersparnis Versand (Cent), nur bei Versandkostenfrei-Promotion. */
      shippingSavedCents: number;
    };
