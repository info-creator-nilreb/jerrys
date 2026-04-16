import { netCentsFromGross, vatCentsFromGross } from "@/lib/catalog/pricing";
import { shippingGrossCentsForCountry, SHIPPING_VAT_PERCENT, shippingVatCentsFromGross } from "@/lib/shop/shipping-compute";
import { vatAppliesForShippingCountry } from "@/lib/tax/eu-vat";

export type OrderPriceLineInput = {
  quantity: number;
  priceGrossCents: number;
  taxRatePercent: number;
};

export type CheckoutOrderTotals = {
  vatApplies: boolean;
  /** Summe Waren: bei EU Brutto-Katalogpreise, bei Drittland Netto je Zeile */
  subtotalCents: number;
  shippingCents: number;
  taxAmountCents: number;
  totalCents: number;
};

/**
 * Einheitliche Berechnung für Checkout-Anzeige und Order-Erstellung.
 * Frei-Versand-Schwelle nutzt weiterhin den Katalog-Bruttowarenwert (wie bisher).
 */
export function computeCheckoutOrderTotals(input: {
  lines: OrderPriceLineInput[];
  shippingCountryCode: string;
  shippingRatesCentsByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
}): CheckoutOrderTotals {
  const catalogSubtotalGross = input.lines.reduce(
    (s, l) => s + l.quantity * l.priceGrossCents,
    0,
  );

  const shippingRaw = shippingGrossCentsForCountry({
    subtotalGrossCents: catalogSubtotalGross,
    shippingCountryCode: input.shippingCountryCode,
    shippingRatesCentsByCountry: input.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: input.freeShippingFromSubtotalGrossCents,
  });

  if (vatAppliesForShippingCountry(input.shippingCountryCode)) {
    let tax = 0;
    for (const l of input.lines) {
      const gross = l.quantity * l.priceGrossCents;
      tax += vatCentsFromGross(gross, l.taxRatePercent);
    }
    tax += shippingVatCentsFromGross(shippingRaw);
    return {
      vatApplies: true,
      subtotalCents: catalogSubtotalGross,
      shippingCents: shippingRaw,
      taxAmountCents: tax,
      totalCents: catalogSubtotalGross + shippingRaw,
    };
  }

  let subNet = 0;
  for (const l of input.lines) {
    subNet += l.quantity * netCentsFromGross(l.priceGrossCents, l.taxRatePercent);
  }
  const shippingNet =
    shippingRaw <= 0 ? 0 : netCentsFromGross(shippingRaw, SHIPPING_VAT_PERCENT);

  return {
    vatApplies: false,
    subtotalCents: subNet,
    shippingCents: shippingNet,
    taxAmountCents: 0,
    totalCents: subNet + shippingNet,
  };
}
