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
const displayNamesEn = new Intl.DisplayNames(["en"], { type: "region" });

function countryNameDe(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function countryNameEn(code: string): string {
  try {
    return displayNamesEn.of(code) ?? code;
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
    out.push({ code: upper, name: countryNameDe(upper) });
  }

  for (const code of allCodes) {
    const upper = code.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    out.push({ code: upper, name: countryNameDe(upper) });
  }

  return out;
}

const ISO_OPTIONS = listIsoCountryOptions();

const NAME_TO_CODE = new Map<string, string>();
for (const opt of ISO_OPTIONS) {
  registerCountryAlias(opt.name, opt.code);
  registerCountryAlias(countryNameEn(opt.code), opt.code);
  registerCountryAlias(opt.code, opt.code);
}

/** Häufige freie Eingaben aus Bestandsdaten / Shopify-Import. */
registerCountryAlias("Deutschland", "DE");
registerCountryAlias("Germany", "DE");
registerCountryAlias("Bundesrepublik Deutschland", "DE");
registerCountryAlias("Österreich", "AT");
registerCountryAlias("Oesterreich", "AT");
registerCountryAlias("Austria", "AT");
registerCountryAlias("Schweiz", "CH");
registerCountryAlias("Switzerland", "CH");
registerCountryAlias("Niederlande", "NL");
registerCountryAlias("Netherlands", "NL");
registerCountryAlias("Holland", "NL");
registerCountryAlias("Italien", "IT");
registerCountryAlias("Italy", "IT");
registerCountryAlias("Frankreich", "FR");
registerCountryAlias("France", "FR");
registerCountryAlias("Spanien", "ES");
registerCountryAlias("Spain", "ES");
registerCountryAlias("Polen", "PL");
registerCountryAlias("Poland", "PL");
registerCountryAlias("Tschechien", "CZ");
registerCountryAlias("Czechia", "CZ");
registerCountryAlias("Czech Republic", "CZ");
registerCountryAlias("Vereinigtes Königreich", "GB");
registerCountryAlias("United Kingdom", "GB");
registerCountryAlias("UK", "GB");
registerCountryAlias("Großbritannien", "GB");
registerCountryAlias("Grossbritannien", "GB");
registerCountryAlias("USA", "US");
registerCountryAlias("United States", "US");
registerCountryAlias("Vereinigte Staaten", "US");
registerCountryAlias("China", "CN");
registerCountryAlias("Taiwan", "TW");
registerCountryAlias("Hongkong", "HK");
registerCountryAlias("Hong Kong", "HK");

function registerCountryAlias(label: string, code: string) {
  const norm = normalizeCountrySearchText(label);
  if (norm) NAME_TO_CODE.set(norm, code);
}

/** Normalisiert Ländernamen für Lookup (Umlaute, Made-in-Präfix, Satzzeichen). */
export function normalizeCountrySearchText(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^made\s+in\s+/i, "")
    .replace(/^produced\s+in\s+/i, "")
    .replace(/^hergestellt\s+in\s+/i, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mappt freie Herkunfts-Eingabe (DE, Deutschland, Made in Germany, …) auf ISO alpha-2.
 */
export function countryCodeFromValue(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();

  const norm = normalizeCountrySearchText(t);
  if (!norm) return null;

  const direct = NAME_TO_CODE.get(norm);
  if (direct) return direct;

  // „deutschland (eu)“ o. ä.
  const compact = norm.replace(/\s+/g, "");
  const compactHit = NAME_TO_CODE.get(compact);
  if (compactHit) return compactHit;

  for (const opt of ISO_OPTIONS) {
    const nameNorm = normalizeCountrySearchText(opt.name);
    if (!nameNorm) continue;
    if (norm === nameNorm || compact === nameNorm.replace(/\s+/g, "")) return opt.code;
    if (norm.includes(nameNorm) || nameNorm.includes(norm)) return opt.code;
  }

  return null;
}

export function countryDisplayName(raw: string): string {
  const code = countryCodeFromValue(raw);
  if (code) return countryNameDe(code);
  return raw.trim();
}
