import {
  computeCheckoutOrderTotals,
  type CheckoutOrderTotals,
  type OrderPriceLineInput,
} from "@/lib/tax/order-price-totals";

/**
 * Termine/Gruppenbuchungen sind immer versandkostenfrei (kein physischer Versand).
 * Adresse bleibt für Rechnung/Kommunikation relevant.
 */
export function computeWorkshopCheckoutOrderTotals(input: {
  lines: OrderPriceLineInput[];
  shippingCountryCode: string;
}): CheckoutOrderTotals {
  return computeCheckoutOrderTotals({
    lines: input.lines,
    shippingCountryCode: input.shippingCountryCode,
    shippingRatesCentsByCountry: {},
    freeShippingFromSubtotalGrossCents: 0,
  });
}
