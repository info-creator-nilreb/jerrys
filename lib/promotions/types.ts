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
} as const;

export type PromotionTypeId = keyof typeof PROMOTION_TYPES;

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
      discountOffSubtotalCents: number;
      source: "code" | "automatic";
    };
