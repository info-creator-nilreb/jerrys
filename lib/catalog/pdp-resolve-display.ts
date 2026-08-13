/**
 * PDP-Anzeige aus Stammdaten — keine produktfremden Hardcodes (z. B. Katzenhöhle-USPs).
 */

import {
  normalizeProductAttributes,
  reconcileAttributesAndFeatureBullets,
  type ProductAttribute,
} from "@/features/catalog";
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
  /** Linke Spalte: Maße / Gewicht / Material. */
  leftSpecs: PdpResolvedSpec[];
  /** Rechte Spalte: Merkmale als einzelne Label/Wert-Zeilen. */
  propertySpecs: PdpResolvedSpec[];
  /**
   * @deprecated Freie Verkaufsargumente erscheinen nur noch als USPs, nicht als Stichpunktliste.
   * Bleibt für Abwärtskompatibilität leer bzw. mit den Roh-Bullets gefüllt.
   */
  propertyLines: string[];
  propertiesIcon: PdpSpecIcon;
  family: PdpProductFamily;
  usps: PdpResolvedUsp[];
};

const PET_HINT =
  /(katze|katzen|hund|hunde|\btier\b|\bpet\b|höhle|krabbel|napf|streu)/i;
const JEWELRY_HINT =
  /(schmuck|ring|ohrring|armband|kette|perle|\bgold\b|\bsilber\b|resin|jewelry|creole)/i;

function attrValues(attrs: ProductAttribute[], ...keys: string[]): string | null {
  for (const key of keys) {
    const hit = attrs.find((a) => a.key === key || a.key.endsWith(`.${key}`));
    if (hit?.values.length) return hit.values.join(", ");
  }
  return null;
}

function attrByKey(attrs: ProductAttribute[], ...keys: string[]): ProductAttribute | null {
  for (const key of keys) {
    const hit = attrs.find(
      (a) => a.key === key || a.key.endsWith(`.${key}`) || a.key.includes(key),
    );
    if (hit) return hit;
  }
  return null;
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
  return /\b(deutschland|germany|de)\b/i.test(raw);
}

function propertiesIconForFamily(family: PdpProductFamily): PdpSpecIcon {
  if (family === "pet") return "paw";
  if (family === "jewelry") return "gem";
  return "sparkles";
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

  const dimensionsText = product.dimensionsText?.trim() || null;
  const weightText = product.weightText?.trim() || null;
  const materialText =
    product.materialText?.trim() ||
    attrValues(attributes, "custom.material", "material") ||
    null;

  const usedAttrKeys = new Set<string>();
  if (materialText) {
    const m = attrByKey(attributes, "custom.material");
    if (m) usedAttrKeys.add(m.key);
  }
  if (dimensionsText) {
    const d = attrByKey(attributes, "custom.ma_e", "custom.masse");
    if (d) usedAttrKeys.add(d.key);
  }

  const leftSpecs: PdpResolvedSpec[] = [];
  if (dimensionsText) {
    leftSpecs.push({
      key: "dimensions",
      label: "Maße",
      value: dimensionsText,
      icon: "ruler",
    });
  }
  if (weightText) {
    leftSpecs.push({
      key: "weight",
      label: "Gewicht",
      value: weightText,
      icon: "scale",
    });
  }
  if (materialText) {
    leftSpecs.push({
      key: "material",
      label: "Material",
      value: materialText,
      icon: "layers",
    });
  }

  const propertySpecs: PdpResolvedSpec[] = [];
  // Stichpunktliste auf der PDP entfällt — freie Zeilen nur als USPs.
  const propertyLines: string[] = [];

  for (const attr of attributes) {
    if (usedAttrKeys.has(attr.key)) continue;
    if (attr.key === "theme.label_color") continue;
    if (attr.key === "theme.label") continue;
    const label =
      attr.key.includes("herstellungsland") || /herkunft/i.test(attr.label)
        ? "Herkunft"
        : attr.label;
    propertySpecs.push({
      key: attr.key,
      label,
      value: attr.values.join(", "),
      icon: iconForAttributeKey(attr.key, label),
    });
  }

  const origin =
    attrValues(attributes, "custom.herstellungsland", "herstellungsland") ||
    propertySpecs.find((s) => s.key.includes("herstellungsland"))?.value ||
    null;

  const usps: PdpResolvedUsp[] = [];
  const usedIcons = new Set<UspIconName>();

  // Händler-USPs zuerst — WYSIWYG: was im Admin steht, erscheint auf der PDP.
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

  // Auto-Badges nur noch freie Slots füllen (keine versteckten 4. Claims).
  if (usps.length < MAX_PRODUCT_USPS && isGermanyOrigin(origin)) {
    const icon: UspIconName = "flag-de";
    usedIcons.add(icon);
    usps.push({
      id: "origin-de",
      title: "Made in Germany",
      subtitle: "Hochwertige Qualität",
      icon,
    });
  }

  const themeLabel = attrValues(attributes, "theme.label");
  if (themeLabel && usps.length < MAX_PRODUCT_USPS) {
    const icon = pickDistinctUspIcon(themeLabel, family, usedIcons);
    usedIcons.add(icon);
    usps.push({
      id: "theme-label",
      title: themeLabel,
      subtitle: null,
      icon,
    });
  }

  return {
    leadText: product.leadText?.trim() || null,
    dimensionsText,
    weightText,
    materialText,
    leftSpecs,
    propertySpecs,
    propertyLines,
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
