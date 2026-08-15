import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { cartLineCommerceRules, getCartWithLines } from "@/lib/cart/cart-queries";
import { parseCheckoutDeliveryMethod, type CheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";
import type { ExpressPromotionInput } from "@/lib/checkout/express-promotion";
import { getPrisma } from "@/lib/db/prisma";
import { loadPromotionsForCheckoutResolve } from "@/lib/promotions/checkout-load";
import {
  computeCheckoutOrderTotalsWithDiscount,
  type CheckoutOrderTotalsWithDiscount,
} from "@/lib/promotions/checkout-totals";
import {
  evaluatePromotionCodeEntry,
  normalizePromotionCode,
  promotionValidationMessage,
  resolveCheckoutPromotion,
} from "@/lib/promotions/engine";
import type { ResolvedCheckoutPromotion } from "@/lib/promotions/types";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";

export type CartPromotionTotalsOk = {
  ok: true;
  shippingCountry: string;
  currency: string;
  deliveryMethod: CheckoutDeliveryMethod;
  totals: CheckoutOrderTotalsWithDiscount;
  resolved: ResolvedCheckoutPromotion;
  codeError: string | null;
};

export type CartPromotionTotalsResult =
  | CartPromotionTotalsOk
  | { ok: false; code: "warenkorb" | "land"; message: string };

function normalizeCountry(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Warenkorb + Lieferland + optionale Promotion (Code / automatisch) → Checkout-Totals.
 * Wird von Preview, Express-Quote und Warenkorb-Express geteilt.
 */
export async function resolveCartPromotionTotals(input: {
  shippingCountry: unknown;
  promotion?: ExpressPromotionInput | null;
  deliveryMethod?: unknown;
}): Promise<CartPromotionTotalsResult> {
  const shippingCountry = normalizeCountry(input.shippingCountry);
  if (shippingCountry.length !== 2) {
    return { ok: false, code: "land", message: "Lieferland fehlt oder ist ungültig." };
  }

  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return { ok: false, code: "warenkorb", message: "Warenkorb nicht gefunden." };
  }
  const cart = await getCartWithLines(cartId);
  const activeLines = (cart?.lines ?? []).filter((l) => l.product.isActive);
  if (!activeLines.length) {
    return { ok: false, code: "warenkorb", message: "Warenkorb ist leer." };
  }

  const shipping = await getShopShippingSettings();
  if (!shipping.shippingCountryCodes.includes(shippingCountry)) {
    return {
      ok: false,
      code: "land",
      message: "In dieses Land liefern wir derzeit nicht.",
    };
  }

  const lines: OrderPriceLineInput[] = activeLines.map((line) => {
    const commerce = cartLineCommerceRules(line);
    return {
      quantity: line.quantity,
      priceGrossCents: commerce.priceGrossCents,
      taxRatePercent: commerce.taxRatePercent,
    };
  });

  const deliveryMethod = parseCheckoutDeliveryMethod(input.deliveryMethod);
  const codeNorm = normalizePromotionCode(input.promotion?.promotionCode ?? "");
  const declineAutomatic = input.promotion?.declineAutomatic === true;

  const prisma = getPrisma();
  const { automaticCandidates, codePromotion } = await loadPromotionsForCheckoutResolve(
    prisma,
    codeNorm.length > 0 ? codeNorm : null,
  );

  const now = new Date();
  let codeError: string | null = null;
  let effectiveCode: string | null = codeNorm.length > 0 ? codeNorm : null;

  if (codeNorm.length > 0) {
    const ev = evaluatePromotionCodeEntry(codeNorm, codePromotion, lines, now, shippingCountry);
    if (ev.status === "invalid") {
      codeError = promotionValidationMessage(ev.reason);
      effectiveCode = null;
    }
  }

  const resolved = resolveCheckoutPromotion({
    lines,
    shippingCountryCode: shippingCountry,
    now,
    promotionCode: effectiveCode,
    declineAutomatic,
    codePromotion: codePromotion && effectiveCode ? codePromotion : null,
    automaticCandidates,
    shippingRatesCentsByCountry: shipping.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shipping.freeShippingFromSubtotalGrossCents,
  });

  const discountOff = resolved.kind === "applied" ? resolved.discountOffSubtotalCents : 0;
  const applyFreeShipping =
    resolved.kind === "applied" && resolved.promotionType === "free_shipping";

  const totals = computeCheckoutOrderTotalsWithDiscount({
    lines,
    shippingCountryCode: shippingCountry,
    shippingRatesCentsByCountry: shipping.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shipping.freeShippingFromSubtotalGrossCents,
    discountOffSubtotalCents: discountOff,
    applyFreeShippingPromotion: applyFreeShipping,
    deliveryMethod,
  });

  return {
    ok: true,
    shippingCountry,
    currency: activeLines[0]!.product.currency,
    deliveryMethod,
    totals,
    resolved,
    codeError,
  };
}
