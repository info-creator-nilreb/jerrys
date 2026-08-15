import { normalizePromotionCode } from "@/lib/promotions/engine";

/** Optionaler Rabatt aus Express-/Wallet-Requests (Checkout-Code oder gespeicherte Präferenz). */
export type ExpressPromotionInput = {
  promotionCode: string;
  declineAutomatic: boolean;
};

export function parseExpressPromotionInput(body: {
  checkoutPromotionCode?: unknown;
  checkoutDeclineAutomatic?: unknown;
  promotionCode?: unknown;
  declineAutomatic?: unknown;
}): ExpressPromotionInput {
  const rawCode =
    typeof body.checkoutPromotionCode === "string"
      ? body.checkoutPromotionCode
      : typeof body.promotionCode === "string"
        ? body.promotionCode
        : "";
  const declineRaw = body.checkoutDeclineAutomatic ?? body.declineAutomatic;
  const declineAutomatic =
    declineRaw === true || declineRaw === "1" || declineRaw === "on" || declineRaw === 1;
  return {
    promotionCode: normalizePromotionCode(rawCode),
    declineAutomatic,
  };
}
