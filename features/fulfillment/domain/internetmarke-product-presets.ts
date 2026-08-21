/**
 * Vorgewählte INTERNETMARKE-Produkte (1–5) für die Auswahl beim Versand.
 */

export const INTERNETMARKE_PRESET_MAX = 5;

export type InternetmarkeProductPreset = {
  productCode: number;
  name: string;
  priceCents: number;
  transport: "national" | "international" | "unknown";
  maxWeightG: number | null;
};

function parseTransport(raw: unknown): InternetmarkeProductPreset["transport"] {
  return raw === "national" || raw === "international" ? raw : "unknown";
}

function parseOne(raw: unknown): InternetmarkeProductPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const codeRaw = row.productCode;
  const code =
    typeof codeRaw === "number"
      ? codeRaw
      : typeof codeRaw === "string"
        ? Number.parseInt(codeRaw, 10)
        : NaN;
  if (!Number.isFinite(code) || code <= 0) return null;

  const priceRaw = row.priceCents;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number.parseInt(priceRaw, 10)
        : NaN;
  if (!Number.isFinite(price) || price <= 0) return null;

  const name =
    typeof row.name === "string" && row.name.trim()
      ? row.name.trim().slice(0, 200)
      : `Produkt ${code}`;

  const maxWeightRaw = row.maxWeightG;
  const maxWeightG =
    typeof maxWeightRaw === "number" && Number.isFinite(maxWeightRaw) ? maxWeightRaw : null;

  return {
    productCode: Math.round(code),
    name,
    priceCents: Math.round(price),
    transport: parseTransport(row.transport),
    maxWeightG,
  };
}

export function parseInternetmarkeProductPresets(raw: unknown): InternetmarkeProductPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: InternetmarkeProductPreset[] = [];
  const seen = new Set<number>();
  for (const row of raw) {
    const parsed = parseOne(row);
    if (!parsed || seen.has(parsed.productCode)) continue;
    seen.add(parsed.productCode);
    out.push(parsed);
    if (out.length >= INTERNETMARKE_PRESET_MAX) break;
  }
  return out;
}

export function mergeLegacyInternetmarkeProduct(
  presets: InternetmarkeProductPreset[],
  legacy: {
    productCode: number | null;
    productPriceCents: number | null;
    productNameSnapshot: string | null;
  },
): InternetmarkeProductPreset[] {
  if (presets.length > 0) return presets;
  if (
    legacy.productCode == null ||
    legacy.productCode <= 0 ||
    legacy.productPriceCents == null ||
    legacy.productPriceCents <= 0
  ) {
    return [];
  }
  return [
    {
      productCode: legacy.productCode,
      name: legacy.productNameSnapshot?.trim() || `Produkt ${legacy.productCode}`,
      priceCents: legacy.productPriceCents,
      transport: "unknown",
      maxWeightG: null,
    },
  ];
}

export function addInternetmarkeProductPreset(
  presets: InternetmarkeProductPreset[],
  next: InternetmarkeProductPreset,
): { ok: true; presets: InternetmarkeProductPreset[] } | { ok: false; error: string } {
  const parsed = parseOne(next);
  if (!parsed) {
    return { ok: false, error: "Ungültiges Porto-Produkt." };
  }
  if (presets.some((p) => p.productCode === parsed.productCode)) {
    return { ok: false, error: "Dieses Produkt ist bereits in der Auswahl." };
  }
  if (presets.length >= INTERNETMARKE_PRESET_MAX) {
    return {
      ok: false,
      error: `Maximal ${INTERNETMARKE_PRESET_MAX} Produkte vorwählen.`,
    };
  }
  return { ok: true, presets: [...presets, parsed] };
}

export function removeInternetmarkeProductPreset(
  presets: InternetmarkeProductPreset[],
  productCode: number,
): InternetmarkeProductPreset[] {
  return presets.filter((p) => p.productCode !== productCode);
}

export function withUpdatedInternetmarkePresetPrice(
  presets: InternetmarkeProductPreset[],
  productCode: number,
  priceCents: number,
): InternetmarkeProductPreset[] {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return presets;
  return presets.map((p) =>
    p.productCode === productCode ? { ...p, priceCents: Math.round(priceCents) } : p,
  );
}

export function findInternetmarkeProductPreset(
  presets: InternetmarkeProductPreset[],
  productCode: number,
): InternetmarkeProductPreset | null {
  return presets.find((p) => p.productCode === productCode) ?? null;
}
