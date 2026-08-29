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

/** Liest Standard-Merkmale; Legacy-Textfelder dienen nur als Fallback. */
export function readStandardSpecValues(
  attributes: ProductAttribute[],
  legacy?: LegacyProductSpecTexts,
): StandardSpecValues {
  const normalized = normalizeProductAttributes(attributes);
  const originRaw =
    firstValue(normalized, STANDARD_SPEC_KEYS.origin) ||
    normalized.find((a) => a.key.includes("herstellungsland"))?.values[0]?.trim() ||
    "";

  return {
    dimensions: firstValue(normalized, STANDARD_SPEC_KEYS.dimensions) || legacy?.dimensionsText?.trim() || "",
    weight: firstValue(normalized, STANDARD_SPEC_KEYS.weight) || legacy?.weightText?.trim() || "",
    material: firstValue(normalized, STANDARD_SPEC_KEYS.material) || legacy?.materialText?.trim() || "",
    originCountryCode: countryCodeFromValue(originRaw) ?? "",
  };
}

/** Überführt Legacy-Textfelder einmalig in Merkmale (Admin-Laden / Import). */
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

  return merged;
}

/** Schreibt Standard-Merkmale aus dem Admin-Formular in die Attribut-Liste. */
export function applyStandardSpecsToAttributes(
  attributes: ProductAttribute[],
  specs: StandardSpecValues,
): ProductAttribute[] {
  const custom = normalizeProductAttributes(attributes).filter(
    (a) => !Object.values(STANDARD_SPEC_KEYS).includes(a.key as (typeof STANDARD_SPEC_KEYS)[keyof typeof STANDARD_SPEC_KEYS]),
  );

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
  const originDisplay = specs.originCountryCode
    ? countryDisplayName(specs.originCountryCode)
    : null;

  return {
    dimensionsText: specs.dimensions || null,
    weightText: specs.weight || null,
    materialText: specs.material || null,
    originDisplay,
  };
}

/** Entfernt doppelte Standard-Merkmale aus der freien Merkmal-Liste. */
export function customAttributesOnly(attributes: ProductAttribute[]): ProductAttribute[] {
  const standardKeys = new Set<string>(Object.values(STANDARD_SPEC_KEYS));
  return normalizeProductAttributes(attributes).filter((a) => !standardKeys.has(a.key));
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
