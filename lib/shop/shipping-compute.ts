import { vatCentsFromGross } from "@/lib/catalog/pricing";

/** Versand wird im Shop mit 19 % USt. ausgewiesen (B2C-Standard). */
export const SHIPPING_VAT_PERCENT = 19;

export type ShippingComputationInput = {
  subtotalGrossCents: number;
  shippingCountryCode: string;
  shippingRatesCentsByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
};

export function shippingGrossCentsForCountry(input: ShippingComputationInput): number {
  const c = input.shippingCountryCode.trim().toUpperCase();
  if (
    input.freeShippingFromSubtotalGrossCents != null &&
    input.subtotalGrossCents >= input.freeShippingFromSubtotalGrossCents
  ) {
    return 0;
  }
  const raw = input.shippingRatesCentsByCountry[c];
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : 0;
  return Math.max(0, n);
}

export function shippingVatCentsFromGross(shippingGrossCents: number): number {
  if (shippingGrossCents <= 0) return 0;
  return vatCentsFromGross(shippingGrossCents, SHIPPING_VAT_PERCENT);
}
