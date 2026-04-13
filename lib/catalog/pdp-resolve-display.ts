/**
 * Display-Fallbacks für die PDP der „Design Katzenhöhle“, falls Stammdaten im Admin noch leer sind.
 * Sobald Felder gepflegt sind, haben DB-Werte Vorrang.
 */
const KATZENHOEHLE_SLUG = "design-katzenhoehle";

const KATZENHOEHLE_DEFAULTS = {
  leadText:
    "Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug, Entspannung und süße Träume.",
  dimensionsText: "ca. 50 × 40 × 35 cm (B × T × H)",
  weightText: "ca. 2,1 kg",
  materialText: "Hochwertiger Kunststoff, kratzfest & pflegeleicht",
  featureBullets: [
    "Stabil & langlebig",
    "Pflegeleicht abwischbar",
    "Angenehm geschlossene Form",
    "Rutschfest durch Gummifüße",
  ],
} as const;

export function isDesignKatzenhoehlePdp(slug: string): boolean {
  return slug.toLowerCase() === KATZENHOEHLE_SLUG;
}

export function resolvePdpLeadText(product: {
  slug: string;
  leadText: string | null;
}): string | null {
  const t = product.leadText?.trim();
  if (t) return t;
  if (isDesignKatzenhoehlePdp(product.slug)) return KATZENHOEHLE_DEFAULTS.leadText;
  return null;
}

export function resolvePdpSpecs(product: {
  slug: string;
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  featureBullets: string[];
}): {
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  featureBullets: string[];
} {
  const useFallback = isDesignKatzenhoehlePdp(product.slug);
  const fb = KATZENHOEHLE_DEFAULTS;
  return {
    dimensionsText: product.dimensionsText?.trim() || (useFallback ? fb.dimensionsText : null),
    weightText: product.weightText?.trim() || (useFallback ? fb.weightText : null),
    materialText: product.materialText?.trim() || (useFallback ? fb.materialText : null),
    featureBullets:
      product.featureBullets.length > 0
        ? product.featureBullets
        : useFallback
          ? [...fb.featureBullets]
          : [],
  };
}
