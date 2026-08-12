/**
 * PDP-Anzeige aus Stammdaten — keine produktfremden Hardcodes (z. B. Katzenhöhle-USPs).
 */

import {
  normalizeProductAttributes,
  reconcileAttributesAndFeatureBullets,
  type ProductAttribute,
} from "@/features/catalog";

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
  /** Freie Stichpunkte (falls gepflegt). */
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

function iconForBullet(line: string, family: PdpProductFamily): PdpSpecIcon {
  const t = line.toLowerCase();
  if (/sicher|geborgen|schutz|rückzug/.test(t)) return family === "pet" ? "paw" : "shield";
  if (/stil|zeitlos|design|schön|elegant/.test(t)) return "heart";
  if (/pflege|klima|nachhalt|öko|bio/.test(t)) return "leaf";
  if (/qualität|handarbeit|handmade|made by/.test(t)) return "sparkles";
  if (family === "jewelry") return "gem";
  if (family === "pet") return "paw";
  return "sparkles";
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
  const propertyLines: string[] = [...reconciled.featureBullets];

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
  if (isGermanyOrigin(origin)) {
    usps.push({
      id: "origin-de",
      title: "Made in Germany",
      subtitle: "Hochwertige Qualität",
      icon: "flag-de",
    });
  }

  const themeLabel = attrValues(attributes, "theme.label");
  if (themeLabel && usps.length < 3) {
    usps.push({
      id: "theme-label",
      title: themeLabel,
      subtitle: null,
      icon: family === "jewelry" ? "gem" : "sparkles",
    });
  }

  // Weitere USPs aus kurzen Feature-Bullets (nicht aus „Label: Wert“-Merkmalen)
  for (const line of reconciled.featureBullets) {
    if (usps.length >= 3) break;
    const t = line.trim();
    if (!t || t.includes(":")) continue;
    if (usps.some((u) => u.title === t)) continue;
    usps.push({
      id: `bullet-${usps.length}`,
      title: t,
      subtitle: null,
      icon: iconForBullet(t, family),
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
