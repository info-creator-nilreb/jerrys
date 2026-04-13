/** Im Admin und Checkout nutzbare Versandländer (ISO-3166-1-alpha-2). */
export const SHOP_SHIPPING_COUNTRY_OPTIONS: readonly { readonly code: string; readonly label: string }[] = [
  { code: "DE", label: "Deutschland" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },
  { code: "BE", label: "Belgien" },
  { code: "NL", label: "Niederlande" },
  { code: "LU", label: "Luxemburg" },
  { code: "FR", label: "Frankreich" },
  { code: "IT", label: "Italien" },
  { code: "ES", label: "Spanien" },
  { code: "PT", label: "Portugal" },
  { code: "PL", label: "Polen" },
  { code: "DK", label: "Dänemark" },
  { code: "SE", label: "Schweden" },
  { code: "FI", label: "Finnland" },
  { code: "IE", label: "Irland" },
] as const;

const ALLOWED_CODES = new Set(SHOP_SHIPPING_COUNTRY_OPTIONS.map((o) => o.code));

export function isShopShippingCountryCode(code: string): boolean {
  return ALLOWED_CODES.has(code.trim().toUpperCase());
}

export function labelForShippingCountryCode(code: string): string {
  const c = code.trim().toUpperCase();
  return SHOP_SHIPPING_COUNTRY_OPTIONS.find((o) => o.code === c)?.label ?? c;
}
