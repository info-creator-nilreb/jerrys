/**
 * INTERNETMARKE erwartet ISO-3166-1 alpha-3 (z. B. DEU).
 * Shop-Adressen nutzen typischerweise alpha-2 (DE).
 */

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  AT: "AUT",
  BE: "BEL",
  BG: "BGR",
  CH: "CHE",
  CY: "CYP",
  CZ: "CZE",
  DE: "DEU",
  DK: "DNK",
  EE: "EST",
  ES: "ESP",
  FI: "FIN",
  FR: "FRA",
  GB: "GBR",
  GR: "GRC",
  HR: "HRV",
  HU: "HUN",
  IE: "IRL",
  IS: "ISL",
  IT: "ITA",
  LI: "LIE",
  LT: "LTU",
  LU: "LUX",
  LV: "LVA",
  MT: "MLT",
  NL: "NLD",
  NO: "NOR",
  PL: "POL",
  PT: "PRT",
  RO: "ROU",
  SE: "SWE",
  SI: "SVN",
  SK: "SVK",
  US: "USA",
};

export function toInternetmarkeCountryCode(country: string): string | null {
  const c = country.trim().toUpperCase();
  if (c.length === 3 && /^[A-Z]{3}$/.test(c)) return c;
  if (c.length === 2) return ALPHA2_TO_ALPHA3[c] ?? null;
  return null;
}
