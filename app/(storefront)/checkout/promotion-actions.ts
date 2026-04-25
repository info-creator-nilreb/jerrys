"use server";

import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartWithLines } from "@/lib/cart/cart-queries";
import { getPrisma } from "@/lib/db/prisma";
import { loadPromotionsForCheckoutResolve } from "@/lib/promotions/checkout-load";
import { computeCheckoutOrderTotalsWithDiscount } from "@/lib/promotions/checkout-totals";
import {
  evaluatePromotionCodeEntry,
  normalizePromotionCode,
  promotionValidationMessage,
  resolveCheckoutPromotion,
} from "@/lib/promotions/engine";
import type { ResolvedCheckoutPromotion } from "@/lib/promotions/types";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";

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
}): Promise<CheckoutPromotionPreview | { error: string }> {
  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return { error: "Warenkorb nicht gefunden." };
  }
  const cart = await getCartWithLines(cartId);
  if (!cart?.lines.length) {
    return { error: "Warenkorb ist leer." };
  }

  const activeLines = cart.lines.filter((l) => l.product.isActive);
  if (!activeLines.length) {
    return { error: "Keine bestellbaren Artikel im Warenkorb." };
  }

  const lines: OrderPriceLineInput[] = activeLines.map((line) => ({
    quantity: line.quantity,
    priceGrossCents: line.product.priceGrossCents,
    taxRatePercent: line.product.taxRatePercent,
  }));

  const shopShip = await getShopShippingSettings();
  const country = input.shippingCountry.trim().toUpperCase();
  if (!shopShip.shippingCountryCodes.includes(country)) {
    return { error: "Lieferland nicht verfügbar." };
  }

  const prisma = getPrisma();
  const codeNorm = normalizePromotionCode(input.promotionCode ?? "");
  const { automaticCandidates, codePromotion } = await loadPromotionsForCheckoutResolve(
    prisma,
    codeNorm.length > 0 ? codeNorm : null,
  );

  const now = new Date();
  let codeError: string | null = null;
  let effectiveCode: string | null = codeNorm.length > 0 ? codeNorm : null;

  if (codeNorm.length > 0) {
    const ev = evaluatePromotionCodeEntry(codeNorm, codePromotion, lines, now, country);
    if (ev.status === "invalid") {
      codeError = promotionValidationMessage(ev.reason);
      effectiveCode = null;
    }
  }

  const declineAutomatic = input.declineAutomatic === true;

  const resolved = resolveCheckoutPromotion({
    lines,
    shippingCountryCode: country,
    now,
    promotionCode: effectiveCode,
    declineAutomatic,
    codePromotion: codePromotion && effectiveCode ? codePromotion : null,
    automaticCandidates,
    shippingRatesCentsByCountry: shopShip.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shopShip.freeShippingFromSubtotalGrossCents,
  });

  const discountOff =
    resolved.kind === "applied" ? resolved.discountOffSubtotalCents : 0;
  const applyFreeShipping =
    resolved.kind === "applied" && resolved.promotionType === "free_shipping";

  const totals = computeCheckoutOrderTotalsWithDiscount({
    lines,
    shippingCountryCode: country,
    shippingRatesCentsByCountry: shopShip.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shopShip.freeShippingFromSubtotalGrossCents,
    discountOffSubtotalCents: discountOff,
    applyFreeShippingPromotion: applyFreeShipping,
  });

  return {
    codeError,
    resolved,
    totals: {
      vatApplies: totals.vatApplies,
      catalogSubtotalBeforeDiscountCents: totals.catalogSubtotalBeforeDiscountCents,
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      taxAmountCents: totals.taxAmountCents,
      totalCents: totals.totalCents,
      discountOffSubtotalCents: totals.discountOffSubtotalCents,
      shippingSavedByPromotionCents: totals.shippingSavedByPromotionCents,
    },
  };
}
