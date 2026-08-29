/**
 * PDP-Anzeige aus Stammdaten — keine produktfremden Hardcodes (z. B. Katzenhöhle-USPs).
 */

import {
  normalizeProductAttributes,
  reconcileAttributesAndFeatureBullets,
  type ProductAttribute,
} from "@/features/catalog";
import { countryDisplayName } from "@/lib/catalog/iso-countries-de";
import { specTextsFromAttributes } from "@/lib/catalog/standard-product-attributes";
import {
  MAX_PRODUCT_USPS,
  pickDistinctUspIcon,
  type UspIconName,
} from "@/lib/catalog/usp-icons";

export type PdpProductFamily = "pet" | "jewelry" | "general";

export type PdpSpecIcon =
  | "ruler"
  | "scale"
  | "layers"
  | "palette"
  | "map-pin"
  | "gem"
  | "users"
  | "sparkles"
  | "tag"
  | "paw"
  | "leaf"
  | "heart"
  | "shield"
  | "flag-de";

export type PdpResolvedSpec = {
  key: string;
  label: string;
  value: string;
  icon: PdpSpecIcon;
};

export type PdpResolvedUsp = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: PdpSpecIcon;
};

export type PdpResolvedDisplay = {
  leadText: string | null;
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  /** Badge auf der Galerie (z. B. „Made by me“ aus theme.label). */
  galleryBadgeLabel: string | null;
  /** Kuratierte Specs oberhalb der Falz (max. 4). */
  visibleSpecs: PdpResolvedSpec[];
  /** Zusätzliche Specs hinter „Alle Details“. */
  extraSpecs: PdpResolvedSpec[];
  /** @deprecated Linke Spalte — weiterhin befüllt für Tests/Abwärtskompatibilität. */
  leftSpecs: PdpResolvedSpec[];
  /** @deprecated Rechte Spalte — weiterhin befüllt für Tests/Abwärtskompatibilität. */
  propertySpecs: PdpResolvedSpec[];
  propertyLines: string[];
  propertiesIcon: PdpSpecIcon;
  family: PdpProductFamily;
  usps: PdpResolvedUsp[];
};

const PDP_MAX_VISIBLE_SPECS = 4;

const PET_HINT =
  /(katze|katzen|hund|hunde|\btier\b|\bpet\b|höhle|krabbel|napf|streu)/i;
const JEWELRY_HINT =
  /(schmuck|ring|ohrring|armband|kette|perle|\bgold\b|\bsilber\b|resin|jewelry|creole)/i;

/** Filter-/SEO-Merkmale — nicht auf der PDP anzeigen. */
const PDP_HIDDEN_ATTRIBUTE_KEY_RE =
  /(?:age-group|altersgruppe|target-gender|zielgeschlecht|jewelry-type|schmucktyp|necklace-design|halskettendesign|bracelet-design|armband-design|earring-design|ohrring-design|ring-design|ringform|ring-size|ringgr)/i;

const COLOR_ATTR_SUFFIXES = ["farbe", "color-pattern"];
const MATERIAL_ATTR_SUFFIXES = ["material", "jewelry-material", "schmuckmaterial"];

function attrValues(attrs: ProductAttribute[], ...keys: string[]): string | null {
  for (const key of keys) {
    const hit = attrs.find((a) => a.key === key || a.key.endsWith(`.${key}`));
    if (hit?.values.length) return hit.values.join(", ");
  }
  return null;
}

function keyMatchesSuffix(key: string, suffixes: string[]): boolean {
  const lower = key.toLowerCase();
  return suffixes.some((s) => lower === s || lower.endsWith(`.${s}`) || lower.includes(s));
}

function mergeAttributeValues(attrs: ProductAttribute[], suffixes: string[]): string | null {
  const values: string[] = [];
  for (const attr of attrs) {
    if (!keyMatchesSuffix(attr.key, suffixes)) continue;
    for (const v of attr.values) {
      const t = v.trim();
      if (t && !values.some((x) => x.toLowerCase() === t.toLowerCase())) {
        values.push(t);
      }
    }
  }
  return values.length ? values.join(", ") : null;
}

export function resolvePdpProductFamily(input: {
  title?: string | null;
  slug?: string | null;
  categoryTitles?: string[];
  categorySlugs?: string[];
  attributes?: ProductAttribute[];
}): PdpProductFamily {
  const hay = [
    input.title ?? "",
    input.slug ?? "",
    ...(input.categoryTitles ?? []),
    ...(input.categorySlugs ?? []),
    ...(input.attributes ?? []).flatMap((a) => [a.label, a.key, ...a.values]),
  ].join(" ");
  if (PET_HINT.test(hay)) return "pet";
  if (
    JEWELRY_HINT.test(hay) ||
    (input.attributes ?? []).some((a) => a.key.includes("jewelry") || a.key.includes("bracelet"))
  ) {
    return "jewelry";
  }
  return "general";
}

export function iconForAttributeKey(key: string, label: string): PdpSpecIcon {
  const k = `${key} ${label}`.toLowerCase();
  if (/farbe|color|pattern/.test(k)) return "palette";
  if (/herkunft|herstellungsland|origin|country|alter/.test(k) && /land|origin|herkunft|country/.test(k)) {
    return "map-pin";
  }
  if (/altersgruppe|age-group|zielgeschlecht|gender/.test(k)) return "users";
  if (/material|stoff|fabric|resin|metall/.test(k)) return "layers";
  if (/ma[sß]e|dimension|größe|size|ringgr/.test(k)) return "ruler";
  if (/gewicht|weight|gramm/.test(k)) return "scale";
  if (/schmuck|jewelry|edelstein|gem|perle|ring|ohrring|armband/.test(k)) return "gem";
  if (/duft|pflege|leaf|bio|öko/.test(k)) return "leaf";
  return "tag";
}

function isGermanyOrigin(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const display = countryDisplayName(raw);
  return /\b(deutschland|germany|de)\b/i.test(display) || /\b(deutschland|germany|de)\b/i.test(raw);
}

function isHiddenPdpAttribute(attr: ProductAttribute): boolean {
  if (attr.key === "theme.label" || attr.key === "theme.label_color") return true;
  return PDP_HIDDEN_ATTRIBUTE_KEY_RE.test(`${attr.key} ${attr.label}`);
}

function propertiesIconForFamily(family: PdpProductFamily): PdpSpecIcon {
  if (family === "pet") return "paw";
  if (family === "jewelry") return "gem";
  return "sparkles";
}

function normalizeSpecLabel(attr: ProductAttribute): string {
  if (attr.key.includes("herstellungsland") || /herkunft/i.test(attr.label)) {
    return "Herkunft";
  }
  if (keyMatchesSuffix(attr.key, COLOR_ATTR_SUFFIXES) || /^farbe$/i.test(attr.label.trim())) {
    return "Farbe";
  }
  if (keyMatchesSuffix(attr.key, MATERIAL_ATTR_SUFFIXES) || /^material$/i.test(attr.label.trim())) {
    return "Material";
  }
  return attr.label;
}

function specPriority(label: string): number {
  const l = label.toLowerCase();
  if (l === "material") return 0;
  if (l === "farbe") return 1;
  if (l === "maße" || l === "masse") return 2;
  if (l === "herkunft") return 3;
  if (l === "gewicht") return 4;
  return 10;
}

function curateSpecs(allSpecs: PdpResolvedSpec[]): {
  visibleSpecs: PdpResolvedSpec[];
  extraSpecs: PdpResolvedSpec[];
} {
  const byLabel = new Map<string, PdpResolvedSpec>();
  for (const spec of allSpecs) {
    const existing = byLabel.get(spec.label);
    if (!existing) {
      byLabel.set(spec.label, spec);
      continue;
    }
    const mergedValues = [...existing.value.split(/,\s*/), ...spec.value.split(/,\s*/)]
      .map((v) => v.trim())
      .filter(Boolean);
    const unique: string[] = [];
    for (const v of mergedValues) {
      if (!unique.some((x) => x.toLowerCase() === v.toLowerCase())) unique.push(v);
    }
    byLabel.set(spec.label, { ...existing, value: unique.join(", ") });
  }

  const sorted = [...byLabel.values()].sort(
    (a, b) => specPriority(a.label) - specPriority(b.label) || a.label.localeCompare(b.label, "de"),
  );

  return {
    visibleSpecs: sorted.slice(0, PDP_MAX_VISIBLE_SPECS),
    extraSpecs: sorted.slice(PDP_MAX_VISIBLE_SPECS),
  };
}

/**
 * Baut Specs, Eigenschaften und USPs ausschließlich aus gepflegten Produktdaten.
 */
export function resolvePdpDisplay(product: {
  slug: string;
  title: string;
  leadText: string | null;
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  featureBullets: string[];
  attributes?: unknown;
  categoryTitles?: string[];
  categorySlugs?: string[];
}): PdpResolvedDisplay {
  const reconciled = reconcileAttributesAndFeatureBullets(
    normalizeProductAttributes(product.attributes),
    product.featureBullets,
  );
  const attributes = reconciled.attributes;
  const family = resolvePdpProductFamily({
    title: product.title,
    slug: product.slug,
    categoryTitles: product.categoryTitles,
    categorySlugs: product.categorySlugs,
    attributes,
  });

  const galleryBadgeLabel = attrValues(attributes, "theme.label")?.trim() || null;

  const specTexts = specTextsFromAttributes(attributes, {
    dimensionsText: product.dimensionsText,
    weightText: product.weightText,
    materialText: product.materialText,
  });
  const dimensionsText = specTexts.dimensionsText;
  const weightText = specTexts.weightText;
  const mergedMaterial =
    specTexts.materialText ||
    mergeAttributeValues(attributes, MATERIAL_ATTR_SUFFIXES) ||
    null;
  const mergedColor = mergeAttributeValues(attributes, COLOR_ATTR_SUFFIXES);

  const usedAttrKeys = new Set<string>();
  for (const attr of attributes) {
    if (keyMatchesSuffix(attr.key, MATERIAL_ATTR_SUFFIXES) && mergedMaterial) {
      usedAttrKeys.add(attr.key);
    }
    if (keyMatchesSuffix(attr.key, COLOR_ATTR_SUFFIXES) && mergedColor) {
      usedAttrKeys.add(attr.key);
    }
    if (dimensionsText && (attr.key.includes("ma_e") || attr.key.includes("masse"))) {
      usedAttrKeys.add(attr.key);
    }
  }

  const leftSpecs: PdpResolvedSpec[] = [];
  const primarySpecs: PdpResolvedSpec[] = [];

  if (dimensionsText) {
    const spec: PdpResolvedSpec = {
      key: "dimensions",
      label: "Maße",
      value: dimensionsText,
      icon: "ruler",
    };
    leftSpecs.push(spec);
    primarySpecs.push(spec);
  }
  if (weightText) {
    const spec: PdpResolvedSpec = {
      key: "weight",
      label: "Gewicht",
      value: weightText,
      icon: "scale",
    };
    leftSpecs.push(spec);
    primarySpecs.push(spec);
  }
  if (mergedMaterial) {
    const spec: PdpResolvedSpec = {
      key: "material",
      label: "Material",
      value: mergedMaterial,
      icon: "layers",
    };
    leftSpecs.push(spec);
    primarySpecs.push(spec);
  }
  if (mergedColor) {
    primarySpecs.push({
      key: "color",
      label: "Farbe",
      value: mergedColor,
      icon: "palette",
    });
  }

  const propertySpecs: PdpResolvedSpec[] = [];
  for (const attr of attributes) {
    if (usedAttrKeys.has(attr.key)) continue;
    if (isHiddenPdpAttribute(attr)) continue;
    if (keyMatchesSuffix(attr.key, COLOR_ATTR_SUFFIXES)) continue;
    if (keyMatchesSuffix(attr.key, MATERIAL_ATTR_SUFFIXES)) continue;

    const label = normalizeSpecLabel(attr);
    const spec: PdpResolvedSpec = {
      key: attr.key,
      label,
      value: attr.values.join(", "),
      icon: iconForAttributeKey(attr.key, label),
    };
    propertySpecs.push(spec);
    if (!primarySpecs.some((s) => s.label === label)) {
      primarySpecs.push(spec);
    }
  }

  const origin =
    specTexts.originDisplay ||
    attrValues(attributes, "custom.herstellungsland", "herstellungsland") ||
    propertySpecs.find((s) => s.key.includes("herstellungsland") || s.label === "Herkunft")?.value ||
    null;

  const { visibleSpecs, extraSpecs } = curateSpecs(primarySpecs);
  const originShownInSpecs =
    isGermanyOrigin(origin) &&
    primarySpecs.some((s) => s.label === "Herkunft" && isGermanyOrigin(s.value));

  const usps: PdpResolvedUsp[] = [];
  const usedIcons = new Set<UspIconName>();

  for (const line of reconciled.featureBullets) {
    if (usps.length >= MAX_PRODUCT_USPS) break;
    const t = line.trim();
    if (!t || t.includes(":")) continue;
    if (usps.some((u) => u.title === t)) continue;
    const icon = pickDistinctUspIcon(t, family, usedIcons);
    usedIcons.add(icon);
    usps.push({
      id: `bullet-${usps.length}`,
      title: t,
      subtitle: null,
      icon,
    });
  }

  if (!originShownInSpecs && usps.length < MAX_PRODUCT_USPS && isGermanyOrigin(origin)) {
    const icon: UspIconName = "flag-de";
    usedIcons.add(icon);
    usps.push({
      id: "origin-de",
      title: "Made in Germany",
      subtitle: "Hochwertige Qualität",
      icon,
    });
  }

  return {
    leadText: product.leadText?.trim() || null,
    dimensionsText,
    weightText,
    materialText: mergedMaterial,
    galleryBadgeLabel,
    visibleSpecs,
    extraSpecs,
    leftSpecs,
    propertySpecs,
    propertyLines: [],
    propertiesIcon: propertiesIconForFamily(family),
    family,
    usps,
  };
}

/** @deprecated — nutze resolvePdpDisplay */
export function resolvePdpLeadText(product: {
  slug: string;
  leadText: string | null;
}): string | null {
  return product.leadText?.trim() || null;
}

/** @deprecated — nutze resolvePdpDisplay */
export function resolvePdpSpecs(product: {
  slug: string;
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  featureBullets: string[];
  attributes?: unknown;
}): {
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  featureBullets: string[];
  attributes: unknown;
} {
  const d = resolvePdpDisplay({
    slug: product.slug,
    title: "",
    leadText: null,
    dimensionsText: product.dimensionsText,
    weightText: product.weightText,
    materialText: product.materialText,
    featureBullets: product.featureBullets,
    attributes: product.attributes,
  });
  return {
    dimensionsText: d.dimensionsText,
    weightText: d.weightText,
    materialText: d.materialText,
    featureBullets: d.propertyLines,
    attributes: product.attributes ?? [],
  };
}

export function isDesignKatzenhoehlePdp(slug: string): boolean {
  return slug.toLowerCase() === "design-katzenhoehle";
}
