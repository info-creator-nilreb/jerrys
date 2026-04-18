import { netCentsFromGross, vatCentsFromGross } from "@/lib/catalog/pricing";
import { shippingGrossCentsForCountry, SHIPPING_VAT_PERCENT, shippingVatCentsFromGross } from "@/lib/shop/shipping-compute";
import { vatAppliesForShippingCountry } from "@/lib/tax/eu-vat";
import type { CheckoutOrderTotals, OrderPriceLineInput } from "@/lib/tax/order-price-totals";

export type CheckoutOrderTotalsWithDiscount = CheckoutOrderTotals & {
  discountOffSubtotalCents: number;
  /** Warenwert vor Rabatt (wie bisherige Zwischensumme). */
  catalogSubtotalBeforeDiscountCents: number;
};

/**
 * Rabatt nur auf Warenwert; Versand & Frei-Versand-Schwelle weiterhin auf Basis des Katalog-Warenkorbs (vor Rabatt).
 */
export function computeCheckoutOrderTotalsWithDiscount(input: {
  lines: OrderPriceLineInput[];
  shippingCountryCode: string;
  shippingRatesCentsByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
  discountOffSubtotalCents: number;
}): CheckoutOrderTotalsWithDiscount {
  const discountRaw = Math.max(0, Math.round(input.discountOffSubtotalCents));

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
    const discountOff = Math.min(discountRaw, catalogSubtotalGross);
    const subtotalAfter = catalogSubtotalGross - discountOff;
    const scale = catalogSubtotalGross > 0 ? subtotalAfter / catalogSubtotalGross : 0;

    let tax = 0;
    for (const l of input.lines) {
      const lineGross = l.quantity * l.priceGrossCents;
      const lineGrossDisc = Math.round(lineGross * scale);
      tax += vatCentsFromGross(lineGrossDisc, l.taxRatePercent);
    }
    tax += shippingVatCentsFromGross(shippingRaw);

    return {
      vatApplies: true,
      catalogSubtotalBeforeDiscountCents: catalogSubtotalGross,
      subtotalCents: subtotalAfter,
      shippingCents: shippingRaw,
      taxAmountCents: tax,
      totalCents: subtotalAfter + shippingRaw,
      discountOffSubtotalCents: discountOff,
    };
  }

  let subNet = 0;
  for (const l of input.lines) {
    subNet += l.quantity * netCentsFromGross(l.priceGrossCents, l.taxRatePercent);
  }
  const discountOff = Math.min(discountRaw, subNet);
  const subtotalAfter = subNet - discountOff;

  const shippingNet =
    shippingRaw <= 0 ? 0 : netCentsFromGross(shippingRaw, SHIPPING_VAT_PERCENT);

  return {
    vatApplies: false,
    catalogSubtotalBeforeDiscountCents: subNet,
    subtotalCents: subtotalAfter,
    shippingCents: shippingNet,
    taxAmountCents: 0,
    totalCents: subtotalAfter + shippingNet,
    discountOffSubtotalCents: discountOff,
  };
}
