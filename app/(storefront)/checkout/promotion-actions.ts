"use server";

import { resolveCartPromotionTotals } from "@/lib/checkout/cart-promotion-totals";
import type { ResolvedCheckoutPromotion } from "@/lib/promotions/types";

export type CheckoutPromotionPreview = {
  codeError: string | null;
  resolved: ResolvedCheckoutPromotion;
  totals: {
    vatApplies: boolean;
    catalogSubtotalBeforeDiscountCents: number;
    subtotalCents: number;
    shippingCents: number;
    taxAmountCents: number;
    totalCents: number;
    discountOffSubtotalCents: number;
    shippingSavedByPromotionCents: number;
  };
};

export async function previewCheckoutPromotion(input: {
  shippingCountry: string;
  promotionCode?: string | null;
  declineAutomatic?: boolean;
  deliveryMethod?: "shipping" | "pickup";
}): Promise<CheckoutPromotionPreview | { error: string }> {
  const result = await resolveCartPromotionTotals({
    shippingCountry: input.shippingCountry,
    promotion: {
      promotionCode: input.promotionCode ?? "",
      declineAutomatic: input.declineAutomatic === true,
    },
    deliveryMethod: input.deliveryMethod,
  });

  if (!result.ok) {
    return { error: result.message };
  }

  return {
    codeError: result.codeError,
    resolved: result.resolved,
    totals: {
      vatApplies: result.totals.vatApplies,
      catalogSubtotalBeforeDiscountCents: result.totals.catalogSubtotalBeforeDiscountCents,
      subtotalCents: result.totals.subtotalCents,
      shippingCents: result.totals.shippingCents,
      taxAmountCents: result.totals.taxAmountCents,
      totalCents: result.totals.totalCents,
      discountOffSubtotalCents: result.totals.discountOffSubtotalCents,
      shippingSavedByPromotionCents: result.totals.shippingSavedByPromotionCents,
    },
  };
}
