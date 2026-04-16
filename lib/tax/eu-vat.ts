/**
 * EU-27 (ISO 3166-1 alpha-2). Für B2C-VAT-Ausweisung im Shop: Lieferung in diese Länder = MwSt. je Produktkonfiguration.
 */
const EU27 = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

export function vatAppliesForShippingCountry(countryCode: string): boolean {
  return EU27.has(countryCode.trim().toUpperCase());
}
