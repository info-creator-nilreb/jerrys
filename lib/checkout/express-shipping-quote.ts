import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { cartLineCommerceRules, getCartWithLines } from "@/lib/cart/cart-queries";
import { computeCheckoutOrderTotalsWithDiscount } from "@/lib/promotions/checkout-totals";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";

export type ExpressShippingQuote =
  | {
      ok: true;
      shippingCountry: string;
      currency: string;
      shippingCents: number;
      subtotalCents: number;
      totalGrossCents: number;
    }
  | { ok: false; code: "warenkorb" | "land"; message: string };

function normalizeCountry(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Versandquote für Express-Checkout anhand Warenkorb + Lieferland
 * (Shopify-/Premium-Muster: Betrag im Wallet nach Adresswahl aktualisieren).
 */
export async function quoteExpressShippingForCart(
  shippingCountryRaw: unknown,
): Promise<ExpressShippingQuote> {
  const shippingCountry = normalizeCountry(shippingCountryRaw);
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

  const totals = computeCheckoutOrderTotalsWithDiscount({
    lines,
    shippingCountryCode: shippingCountry,
    shippingRatesCentsByCountry: shipping.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shipping.freeShippingFromSubtotalGrossCents,
    discountOffSubtotalCents: 0,
  });

  return {
    ok: true,
    shippingCountry,
    currency: activeLines[0]!.product.currency,
    shippingCents: totals.shippingCents,
    subtotalCents: totals.subtotalCents,
    totalGrossCents: totals.totalCents,
  };
}

export function defaultExpressShippingCountry(allowed: string[]): string {
  if (allowed.includes("DE")) return "DE";
  return allowed[0] ?? "DE";
}
