import {
  ADDRESS_SUGGEST_LIMIT,
  isAddressSuggestCountry,
  type AddressLocalitySuggestion,
  type AddressStreetSuggestion,
} from "@/lib/address/address-suggest-shared";

/**
 * Adressvorschläge aus der OpenPLZ API (amtliche Verzeichnisse DE/AT/CH/LI, ohne API-Key).
 * https://www.openplzapi.org/
 *
 * Grundsätze:
 * - Vorschläge sind eine Hilfe, keine Zustellgarantie: Fehler und Timeouts führen zu einer
 *   leeren Liste, niemals zu einem harten Fehler im Formular.
 * - Antworten sind cachebar (Verzeichnisse ändern sich selten).
 */
const API_BASE = "https://openplzapi.org";
const REQUEST_TIMEOUT_MS = 6_000;
const CACHE_SECONDS = 60 * 60 * 24 * 7;

function apiPathForCountry(countryCode: string): string | null {
  const cc = countryCode.trim().toUpperCase();
  if (!isAddressSuggestCountry(cc)) return null;
  return cc.toLowerCase();
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

type OpenPlzLocality = { postalCode?: unknown; name?: unknown };
type OpenPlzStreet = { name?: unknown; postalCode?: unknown; locality?: unknown };

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeAndLimit<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyOf(item).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= ADDRESS_SUGGEST_LIMIT) break;
  }
  return out;
}

export async function suggestLocalitiesByPostalCode(
  countryCode: string,
  postalCode: string,
): Promise<AddressLocalitySuggestion[]> {
  const path = apiPathForCountry(countryCode);
  const zip = postalCode.replace(/\s+/g, "");
  if (!path || !zip) return [];

  const params = new URLSearchParams({ postalCode: zip, page: "1", pageSize: "20" });
  const data = await fetchJson(`${API_BASE}/${path}/Localities?${params.toString()}`);
  if (!Array.isArray(data)) return [];

  const mapped = data
    .map((row): AddressLocalitySuggestion => {
      const r = row as OpenPlzLocality;
      return { postalCode: asString(r.postalCode), city: asString(r.name) };
    })
    .filter((r) => r.postalCode && r.city);

  return dedupeAndLimit(mapped, (r) => `${r.postalCode}|${r.city}`);
}

export async function suggestStreets(input: {
  countryCode: string;
  query: string;
  postalCode?: string;
  city?: string;
}): Promise<AddressStreetSuggestion[]> {
  const path = apiPathForCountry(input.countryCode);
  const query = input.query.trim();
  const zip = (input.postalCode ?? "").replace(/\s+/g, "");
  const city = (input.city ?? "").trim();
  if (!path || !query) return [];
  // Ohne PLZ oder Ort wäre die Trefferliste beliebig groß und für Nutzer wertlos.
  if (!zip && !city) return [];

  const params = new URLSearchParams({ name: query, page: "1", pageSize: "20" });
  if (zip) params.set("postalCode", zip);
  if (city) params.set("locality", city);

  const data = await fetchJson(`${API_BASE}/${path}/Streets?${params.toString()}`);
  if (!Array.isArray(data)) return [];

  const mapped = data
    .map((row): AddressStreetSuggestion => {
      const r = row as OpenPlzStreet;
      return {
        street: asString(r.name),
        postalCode: asString(r.postalCode),
        city: asString(r.locality),
      };
    })
    .filter((r) => r.street);

  return dedupeAndLimit(mapped, (r) => `${r.street}|${r.postalCode}|${r.city}`);
}
