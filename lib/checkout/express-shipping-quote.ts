import { resolveCartPromotionTotals } from "@/lib/checkout/cart-promotion-totals";
import type { ExpressPromotionInput } from "@/lib/checkout/express-promotion";

export type ExpressShippingQuote =
  | {
      ok: true;
      shippingCountry: string;
      currency: string;
      shippingCents: number;
      subtotalCents: number;
      totalGrossCents: number;
      discountOffSubtotalCents: number;
    }
  | { ok: false; code: "warenkorb" | "land"; message: string };

/**
 * Versandquote für Express-Checkout anhand Warenkorb + Lieferland + Promotion
 * (Shopify-/Premium-Muster: Betrag im Wallet nach Adresswahl aktualisieren).
 */
export async function quoteExpressShippingForCart(
  shippingCountryRaw: unknown,
  promotion?: ExpressPromotionInput | null,
  deliveryMethod?: unknown,
): Promise<ExpressShippingQuote> {
  const result = await resolveCartPromotionTotals({
    shippingCountry: shippingCountryRaw,
    promotion: promotion ?? { promotionCode: "", declineAutomatic: false },
    deliveryMethod,
  });
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  return {
    ok: true,
    shippingCountry: result.shippingCountry,
    currency: result.currency,
    shippingCents: result.totals.shippingCents,
    subtotalCents: result.totals.subtotalCents,
    totalGrossCents: result.totals.totalCents,
    discountOffSubtotalCents: result.totals.discountOffSubtotalCents,
  };
}

export function defaultExpressShippingCountry(allowed: string[]): string {
  if (allowed.includes("DE")) return "DE";
  return allowed[0] ?? "DE";
}
