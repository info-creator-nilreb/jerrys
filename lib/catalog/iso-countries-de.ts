/** Häufige Herstellungsländer + EU für Dropdown (ISO 3166-1 alpha-2). */
export type IsoCountryOption = {
  code: string;
  name: string;
};

const PRIORITY_CODES = [
  "DE",
  "AT",
  "CH",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "PL",
  "CZ",
  "DK",
  "SE",
  "PT",
  "GB",
  "US",
  "CN",
  "IN",
  "TR",
  "VN",
  "BD",
  "ID",
  "TH",
  "TW",
  "JP",
  "KR",
  "MX",
  "BR",
] as const;

const displayNames = new Intl.DisplayNames(["de"], { type: "region" });

function countryName(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Alle ISO-Länder (deutsch), priorisierte Länder zuerst. */
export function listIsoCountryOptions(): IsoCountryOption[] {
  const allCodes = [
    "AF", "EG", "AL", "DZ", "AD", "AO", "AG", "GQ", "AR", "AM", "AZ", "ET", "AU", "BS", "BH", "BD",
    "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI", "CL", "CN",
    "CR", "CI", "DK", "DE", "DM", "DO", "DJ", "EC", "SV", "ER", "EE", "SZ", "FJ", "FI", "FR", "GA",
    "GM", "GE", "GH", "GD", "GR", "GT", "GN", "GW", "GY", "HT", "HN", "IN", "ID", "IQ", "IR", "IE",
    "IS", "IL", "IT", "JM", "JP", "YE", "JO", "KH", "CM", "CA", "CV", "KZ", "QA", "KE", "KG", "KI",
    "CO", "KM", "CD", "CG", "KP", "KR", "HR", "CU", "KW", "LA", "LS", "LV", "LB", "LR", "LY", "LI",
    "LT", "LU", "MG", "MW", "MY", "MV", "ML", "MT", "MA", "MH", "MR", "MU", "MX", "FM", "MD", "MC",
    "MN", "ME", "MZ", "MM", "NA", "NR", "NP", "NZ", "NI", "NL", "NE", "NG", "MK", "NO", "OM", "AT",
    "PK", "PW", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "RW", "RO", "RU", "SB", "ZM", "WS", "SM",
    "ST", "SA", "SE", "CH", "SN", "RS", "SC", "SL", "ZW", "SG", "SK", "SI", "SO", "ES", "LK", "KN",
    "LC", "VC", "ZA", "SD", "SS", "SR", "SY", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TD", "CZ",
    "TN", "TR", "TM", "TV", "UG", "UA", "HU", "UY", "UZ", "VU", "VA", "VE", "AE", "US", "GB", "VN",
    "CF", "CY",
  ];

  const seen = new Set<string>();
  const out: IsoCountryOption[] = [];

  for (const code of PRIORITY_CODES) {
    const upper = code.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    out.push({ code: upper, name: countryName(upper) });
  }

  for (const code of allCodes) {
    const upper = code.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    out.push({ code: upper, name: countryName(upper) });
  }

  return out;
}

const NAME_TO_CODE = new Map<string, string>();
for (const opt of listIsoCountryOptions()) {
  NAME_TO_CODE.set(opt.name.toLowerCase(), opt.code);
  NAME_TO_CODE.set(opt.code.toLowerCase(), opt.code);
}
NAME_TO_CODE.set("deutschland", "DE");
NAME_TO_CODE.set("germany", "DE");

export function countryCodeFromValue(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return NAME_TO_CODE.get(t.toLowerCase()) ?? null;
}

export function countryDisplayName(raw: string): string {
  const code = countryCodeFromValue(raw);
  if (code) return countryName(code);
  return raw.trim();
}
