import type { ProductAttribute } from "@/features/catalog";
import { mergeProductAttributes, normalizeProductAttributes } from "@/features/catalog/domain/product-attributes";
import { countryCodeFromValue, countryDisplayName } from "@/lib/catalog/iso-countries-de";

export const STANDARD_SPEC_KEYS = {
  dimensions: "custom.ma_e",
  weight: "custom.gewicht",
  material: "custom.material",
  origin: "custom.herstellungsland",
} as const;

export const STANDARD_SPEC_LABELS: Record<keyof typeof STANDARD_SPEC_KEYS, string> = {
  dimensions: "Maße",
  weight: "Gewicht",
  material: "Material",
  origin: "Herstellungsland",
};

export type StandardSpecValues = {
  dimensions: string;
  weight: string;
  material: string;
  originCountryCode: string;
};

export type LegacyProductSpecTexts = {
  dimensionsText?: string | null;
  weightText?: string | null;
  materialText?: string | null;
};

const ORIGIN_KEY_RE =
  /(?:^|[._-])(herstellungsland|herkunft|herkunftsland|country-of-origin|country_of_origin|countryoforigin|made-in|made_in|madein|origin|country|land)(?:[._-]|$)/i;
const ORIGIN_LABEL_RE =
  /^(herkunft|herstellungsland|herkunftsland|ursprungsland|origin|country|country of origin|made in|hergestellt in)$/i;

function firstValue(attrs: ProductAttribute[], key: string): string {
  const hit = attrs.find((a) => a.key === key);
  return hit?.values[0]?.trim() ?? "";
}

function upsertSingleValue(
  attrs: ProductAttribute[],
  key: string,
  label: string,
  value: string,
): ProductAttribute[] {
  const trimmed = value.trim();
  const rest = attrs.filter((a) => a.key !== key);
  if (!trimmed) return rest;
  return normalizeProductAttributes([
    ...rest,
    { key, label, values: [trimmed.slice(0, 120)] },
  ]);
}

/** Erkennt Herkunfts-Merkmale unabhängig vom Shopify-/Manuell-Key (z. B. custom.herkunft). */
export function isOriginAttribute(attr: ProductAttribute): boolean {
  if (attr.key === STANDARD_SPEC_KEYS.origin) return true;
  if (ORIGIN_KEY_RE.test(attr.key)) return true;
  if (ORIGIN_LABEL_RE.test(attr.label.trim())) return true;
  return false;
}

/** Liest den Rohwert für Herkunft aus allen bekannten Merkmal-Varianten. */
export function findOriginRawValue(attributes: ProductAttribute[]): string {
  const normalized = normalizeProductAttributes(attributes);

  const std = firstValue(normalized, STANDARD_SPEC_KEYS.origin);
  if (std) return std;

  for (const attr of normalized) {
    if (ORIGIN_KEY_RE.test(attr.key) && attr.values[0]?.trim()) {
      return attr.values[0].trim();
    }
  }

  for (const attr of normalized) {
    if (ORIGIN_LABEL_RE.test(attr.label.trim()) && attr.values[0]?.trim()) {
      return attr.values[0].trim();
    }
  }

  return "";
}

/** Liest Standard-Merkmale; Legacy-Textfelder dienen nur als Fallback. */
export function readStandardSpecValues(
  attributes: ProductAttribute[],
  legacy?: LegacyProductSpecTexts,
): StandardSpecValues {
  const normalized = normalizeProductAttributes(attributes);
  const originRaw = findOriginRawValue(normalized);

  return {
    dimensions: firstValue(normalized, STANDARD_SPEC_KEYS.dimensions) || legacy?.dimensionsText?.trim() || "",
    weight: firstValue(normalized, STANDARD_SPEC_KEYS.weight) || legacy?.weightText?.trim() || "",
    material: firstValue(normalized, STANDARD_SPEC_KEYS.material) || legacy?.materialText?.trim() || "",
    originCountryCode: countryCodeFromValue(originRaw) ?? "",
  };
}

/** Überführt Legacy-Textfelder und alte Herkunfts-Merkmale in Standard-Keys (ISO). */
export function migrateLegacySpecsIntoAttributes(
  attributes: ProductAttribute[],
  legacy?: LegacyProductSpecTexts,
): ProductAttribute[] {
  let merged = normalizeProductAttributes(attributes);
  const specs = readStandardSpecValues(merged, legacy);

  if (specs.dimensions) {
    merged = upsertSingleValue(
      merged,
      STANDARD_SPEC_KEYS.dimensions,
      STANDARD_SPEC_LABELS.dimensions,
      specs.dimensions,
    );
  }
  if (specs.weight) {
    merged = upsertSingleValue(
      merged,
      STANDARD_SPEC_KEYS.weight,
      STANDARD_SPEC_LABELS.weight,
      specs.weight,
    );
  }
  if (specs.material) {
    merged = upsertSingleValue(
      merged,
      STANDARD_SPEC_KEYS.material,
      STANDARD_SPEC_LABELS.material,
      specs.material,
    );
  }
  if (specs.originCountryCode) {
    merged = upsertSingleValue(
      merged,
      STANDARD_SPEC_KEYS.origin,
      STANDARD_SPEC_LABELS.origin,
      specs.originCountryCode,
    );
  }

  // Alte Herkunfts-Doppelungen (custom.herkunft, Label „Herkunft“) entfernen.
  merged = merged.filter((a) => !isOriginAttribute(a) || a.key === STANDARD_SPEC_KEYS.origin);

  return merged;
}

/** Schreibt Standard-Merkmale aus dem Admin-Formular in die Attribut-Liste. */
export function applyStandardSpecsToAttributes(
  attributes: ProductAttribute[],
  specs: StandardSpecValues,
): ProductAttribute[] {
  const custom = customAttributesOnly(attributes);

  let out = custom;
  out = upsertSingleValue(out, STANDARD_SPEC_KEYS.dimensions, STANDARD_SPEC_LABELS.dimensions, specs.dimensions);
  out = upsertSingleValue(out, STANDARD_SPEC_KEYS.weight, STANDARD_SPEC_LABELS.weight, specs.weight);
  out = upsertSingleValue(out, STANDARD_SPEC_KEYS.material, STANDARD_SPEC_LABELS.material, specs.material);
  out = upsertSingleValue(
    out,
    STANDARD_SPEC_KEYS.origin,
    STANDARD_SPEC_LABELS.origin,
    specs.originCountryCode.trim().toUpperCase(),
  );

  return out;
}

/** Für PDP: Spec-Text aus Merkmalen (ISO-Ländercode → Anzeigename). */
export function specTextsFromAttributes(
  attributes: ProductAttribute[],
  legacy?: LegacyProductSpecTexts,
): {
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  originDisplay: string | null;
} {
  const specs = readStandardSpecValues(attributes, legacy);
  const originRaw = findOriginRawValue(normalizeProductAttributes(attributes));
  const originDisplay =
    (specs.originCountryCode ? countryDisplayName(specs.originCountryCode) : null) ||
    (originRaw.trim() ? countryDisplayName(originRaw) : null) ||
    (originRaw.trim() || null);

  return {
    dimensionsText: specs.dimensions || null,
    weightText: specs.weight || null,
    materialText: specs.material || null,
    originDisplay,
  };
}

/** Entfernt Standard- und Herkunfts-Merkmale aus der freien Merkmal-Liste. */
export function customAttributesOnly(attributes: ProductAttribute[]): ProductAttribute[] {
  const standardKeys = new Set<string>(Object.values(STANDARD_SPEC_KEYS));
  return normalizeProductAttributes(attributes).filter(
    (a) => !standardKeys.has(a.key) && !isOriginAttribute(a),
  );
}

export function standardSpecsFromFormData(formData: FormData): StandardSpecValues {
  return {
    dimensions: String(formData.get("standardDimensions") ?? "").trim(),
    weight: String(formData.get("standardWeight") ?? "").trim(),
    material: String(formData.get("standardMaterial") ?? "").trim(),
    originCountryCode: String(formData.get("standardOriginCountry") ?? "").trim().toUpperCase(),
  };
}

export function mergeAttributesWithStandardForm(
  formData: FormData,
  attributes: ProductAttribute[],
): ProductAttribute[] {
  return applyStandardSpecsToAttributes(attributes, standardSpecsFromFormData(formData));
}
