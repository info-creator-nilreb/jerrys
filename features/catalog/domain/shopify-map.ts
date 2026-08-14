import { netCentsFromGross } from "@/lib/catalog/pricing";
import { productSlugSchema } from "@/lib/catalog/schemas";
import type { DeliveryTimeKey } from "@/lib/catalog/delivery-options";
import { DELIVERY_TIME_OPTIONS } from "@/lib/catalog/delivery-options";
import type { ShopifyParsedProduct } from "@/features/catalog/domain/shopify-csv";
import type { ProductAttribute } from "@/features/catalog/domain/product-attributes";

export type CatalogImportImage = {
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type CatalogImportVariant = {
  /** Shopify-SKU oder Import-SKU aus Handle + Optionen. */
  sku: string;
  /** true wenn nach Mapping keine SKU vergeben werden konnte (Platzhalter-Variante). */
  skuMissing: boolean;
  title: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  priceGrossCents: number;
  priceNetCents: number;
  taxRatePercent: 7 | 19;
  listPriceGrossCents: number | null;
  listPriceNetCents: number | null;
  stockQuantity: number;
  availableQuantity: number;
  /** true bei Kollisions-Umbenennung einer vorhandenen Shopify-SKU. */
  skuGenerated: boolean;
};

export type CatalogImportProduct = {
  sourceHandle: string;
  slug: string;
  title: string;
  descriptionHtml: string | null;
  vendor: string | null;
  productNumber: string | null;
  productType: string | null;
  tags: string[];
  isActive: boolean;
  /** true wenn unvollständig und als Entwurf (inaktiv) importierbar. */
  importAsDraft: boolean;
  leadText: string | null;
  weightText: string | null;
  materialText: string | null;
  dimensionsText: string | null;
  featureBullets: string[];
  attributes: ProductAttribute[];
  deliveryTimeKey: DeliveryTimeKey;
  taxRatePercent: 7 | 19;
  variants: CatalogImportVariant[];
  images: CatalogImportImage[];
  warnings: string[];
  errors: string[];
};

export type MapShopifyOptions = {
  /** Default 19 (DE Brutto-Annahme). */
  taxRatePercent?: 7 | 19;
  deliveryTimeKey?: DeliveryTimeKey;
  /** SEO Description → leadText, wenn leer und kurz genug. */
  mapSeoDescriptionToLeadText?: boolean;
  /**
   * Unvollständige Datensätze (fehlende SKU/Preis/Bilder) als Entwurf (inaktiv) zulassen.
   * Harte Fehler bleiben: kein Titel / ungültiger Slug.
   */
  allowIncompleteAsDraft?: boolean;
};

function decimalToCents(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function variantTitle(optionValues: string[]): string | null {
  const meaningful = optionValues.filter(
    (v) => v && v.toLowerCase() !== "default title",
  );
  if (meaningful.length === 0) return null;
  return meaningful.join(" / ");
}

function isDefaultVariant(optionValues: string[], index: number, total: number): boolean {
  if (total === 1) return true;
  if (index === 0 && optionValues.every((v) => !v || v.toLowerCase() === "default title")) {
    return true;
  }
  return index === 0;
}

/** SKU-tauglicher Slug-Teil (ASCII). */
export function skuSlugPart(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function generateVariantSku(
  handle: string,
  optionValues: string[],
  index: number,
  used: Set<string>,
): string {
  const opt = optionValues
    .filter((v) => v && v.toLowerCase() !== "default title")
    .map(skuSlugPart)
    .filter(Boolean)
    .join("-");
  const handlePart = skuSlugPart(handle) || "import";
  let base = opt ? `${handlePart}-${opt}` : handlePart;
  if (!base) base = `import-${index + 1}`;
  base = base.slice(0, 80);
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, 70)}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

function guessDeliveryTimeKey(note: string): DeliveryTimeKey | null {
  const t = note.toLowerCase();
  if (!t) return null;
  if (/\b1\s*[-–]\s*2\b/.test(t) && /werktag/.test(t)) return "1-2-werktage";
  if (/\b2\s*[-–]\s*4\b/.test(t) && /werktag/.test(t)) return "2-4-werktage";
  if (/\b3\s*[-–]\s*5\b/.test(t) && /werktag/.test(t)) return "2-4-werktage";
  if (/\b5\s*[-–]\s*7\b/.test(t) && /werktag/.test(t)) return "5-7-werktage";
  if (/1\s*[-–]\s*2\s*wochen/.test(t)) return "1-2-wochen";
  return null;
}

export function mapShopifyProductToCatalog(
  source: ShopifyParsedProduct,
  options: MapShopifyOptions = {},
): CatalogImportProduct {
  const taxRatePercent = options.taxRatePercent ?? 19;
  const allowDraft = Boolean(options.allowIncompleteAsDraft);
  const fallbackDelivery =
    options.deliveryTimeKey ??
    (DELIVERY_TIME_OPTIONS.find((o) => o.value === "2-4-werktage")?.value as DeliveryTimeKey);
  let deliveryTimeKey: DeliveryTimeKey = fallbackDelivery;
  const warnings: string[] = [];
  const errors: string[] = [];
  let softIncomplete = false;

  const slugResult = productSlugSchema.safeParse(source.handle);
  const slug = slugResult.success ? slugResult.data : source.handle;
  if (!slugResult.success) {
    errors.push(`Handle „${source.handle}“ ist kein gültiger Slug.`);
  }

  if (!source.title.trim()) {
    errors.push("Titel fehlt.");
  }

  if (source.seoTitle.trim()) {
    warnings.push("SEO Title wird nicht importiert (kein Produkt-SEO-Feld).");
  }

  let leadText: string | null = null;
  if (options.mapSeoDescriptionToLeadText !== false && source.seoDescription.trim()) {
    const seo = source.seoDescription.trim();
    if (seo.length <= 500) {
      leadText = seo;
      warnings.push("SEO Description → leadText übernommen.");
    } else {
      warnings.push("SEO Description zu lang für leadText (>500); übersprungen.");
    }
  }

  if (source.productType.trim()) {
    warnings.push(
      `Product Type „${source.productType}“: kein Auto-Mapping auf Category.`,
    );
  } else if (source.googleProductCategory.trim()) {
    warnings.push(
      `Google Product Category „${source.googleProductCategory}“ — nicht als Shop-Kategorie gemappt.`,
    );
  }
  if (source.tags.length > 0) {
    warnings.push(
      `Tags (${source.tags.length}): kein Tag-Modell — manuelles Collection-/Bullet-Mapping nötig.`,
    );
  }

  const materialText = source.metafields.material.trim() || null;
  const dimensionsText = source.metafields.dimensions.trim() || null;
  const attributes = source.attributes;
  const featureBullets: string[] = [];
  if (materialText) warnings.push("Metafield Material → materialText.");
  if (dimensionsText) warnings.push("Metafield Maße → dimensionsText.");
  if (attributes.length > 0) {
    warnings.push(
      `${attributes.length} Merkmal(e) aus Shopify-Metafeldern übernommen.`,
    );
  }

  if (source.metafields.deliveryNote.trim()) {
    const guessed = guessDeliveryTimeKey(source.metafields.deliveryNote);
    if (guessed) {
      deliveryTimeKey = guessed;
      warnings.push(
        `Lieferzeit-Metafield „${source.metafields.deliveryNote}“ → ${guessed}.`,
      );
    } else {
      warnings.push(
        `Lieferzeit-Metafield „${source.metafields.deliveryNote}“ — Default ${deliveryTimeKey} belassen.`,
      );
    }
  }

  const variants: CatalogImportVariant[] = [];
  let weightText: string | null = null;
  const usedSkus = new Set<string>();
  let missingInventoryColumn = false;

  source.variants.forEach((v, index) => {
    let sku = v.sku.trim();
    let skuGenerated = false;
    let skuMissing = false;
    if (!sku) {
      sku = generateVariantSku(source.handle, v.optionValues, index, usedSkus);
      skuGenerated = true;
      warnings.push(
        `Variante #${index + 1}: keine Shopify-SKU — Import-SKU aus Handle „${sku}“.`,
      );
    } else if (usedSkus.has(sku)) {
      const next = generateVariantSku(source.handle, v.optionValues, index, usedSkus);
      warnings.push(`Variante #${index + 1}: doppelte SKU „${sku}“ → „${next}“.`);
      sku = next;
      skuGenerated = true;
    } else {
      usedSkus.add(sku);
    }

    const skuLabel = sku || `(ohne SKU #${index + 1})`;

    let gross = decimalToCents(v.price);
    if (gross == null) {
      if (allowDraft) {
        gross = 0;
        warnings.push(
          `Variante ${skuLabel}: Preis fehlt/ungültig („${v.price}“) — 0,00 € als Entwurf.`,
        );
        softIncomplete = true;
      } else {
        errors.push(`Variante ${skuLabel}: ungültiger Preis „${v.price}“.`);
        return;
      }
    }

    const compare = decimalToCents(v.compareAtPrice);
    let listGross: number | null = null;
    let listNet: number | null = null;
    if (compare != null && compare > gross) {
      listGross = compare;
      listNet = netCentsFromGross(compare, taxRatePercent);
    } else if (compare != null && compare > 0 && compare <= gross) {
      warnings.push(`Variante ${skuLabel}: Compare-at ≤ Preis — Listenpreis ignoriert.`);
    }

    const qtyRaw = v.inventoryQty.trim();
    let qty = 0;
    if (qtyRaw === "") {
      missingInventoryColumn = true;
    } else {
      const n = Number(qtyRaw);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        if (allowDraft) {
          warnings.push(
            `Variante ${skuLabel}: ungültiger Bestand „${v.inventoryQty}“ — 0 als Entwurf.`,
          );
          softIncomplete = true;
          qty = 0;
        } else {
          errors.push(`Variante ${skuLabel}: ungültiger Bestand „${v.inventoryQty}“.`);
          return;
        }
      } else {
        qty = n;
      }
    }

    if (v.inventoryPolicy.toLowerCase() === "continue") {
      warnings.push(
        `Variante ${skuLabel}: Inventory Policy „continue“ (Verkauf ohne Stock) — hier strikter Bestand.`,
      );
    }
    if (v.variantImageUrl) {
      warnings.push(
        `Variante ${skuLabel}: Variant Image — kein Varianten-Medienmodell; am Produkt prüfen.`,
      );
    }

    const isDefault = isDefaultVariant(v.optionValues, index, source.variants.length);
    if (isDefault && v.grams.trim()) {
      const g = Number(v.grams);
      if (Number.isFinite(g) && g > 0) {
        weightText = `${Math.round(g)} g`;
      }
    }

    variants.push({
      sku,
      skuMissing,
      title: variantTitle(v.optionValues),
      isDefault,
      isActive: true,
      sortOrder: index,
      priceGrossCents: gross,
      priceNetCents: netCentsFromGross(gross, taxRatePercent),
      taxRatePercent,
      listPriceGrossCents: listGross,
      listPriceNetCents: listNet,
      stockQuantity: qty,
      availableQuantity: qty,
      skuGenerated,
    });
  });

  if (missingInventoryColumn) {
    warnings.push(
      "Kein/leeres „Variant Inventory Qty“ im Export — Bestand auf 0 gesetzt (Shopify-Export oft ohne Qty).",
    );
  }

  if (variants.length === 0) {
    if (allowDraft && source.title.trim() && slugResult.success) {
      variants.push({
        sku: "",
        skuMissing: true,
        title: null,
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        priceGrossCents: 0,
        priceNetCents: 0,
        taxRatePercent,
        listPriceGrossCents: null,
        listPriceNetCents: null,
        stockQuantity: 0,
        availableQuantity: 0,
        skuGenerated: false,
      });
      warnings.push("Keine Variantenzeile — Platzhalter-Variante ohne SKU als Entwurf.");
      softIncomplete = true;
    } else {
      errors.push("Keine Varianten mit gültigem Preis.");
    }
  } else if (!variants.some((v) => v.isDefault)) {
    variants[0]!.isDefault = true;
    warnings.push("Keine Default-Variante erkannt — erste Variante als Default gesetzt.");
  } else {
    let seen = false;
    for (const v of variants) {
      if (v.isDefault) {
        if (seen) v.isDefault = false;
        seen = true;
      }
    }
  }

  const images: CatalogImportImage[] = source.images.map((img, index) => ({
    url: img.url,
    alt: img.alt?.trim() || source.title.trim() || null,
    sortOrder: index,
    isCover: index === 0,
  }));

  if (images.length === 0) {
    warnings.push("Keine Bilder — Cover fehlt.");
  } else {
    warnings.push(
      "Bild-URLs von Shopify: beim Apply optional lokal/Blob spiegeln (HEIC wird übersprungen).",
    );
  }

  const productNumber =
    variants.find((v) => !v.skuMissing && !v.skuGenerated && v.sku.trim())?.sku ?? null;

  // Entwurf: Shopify-Draft ODER unvollständig mit Option
  const shopifyInactive =
    !source.published || source.status.toLowerCase() === "draft" || source.status.toLowerCase() === "archived";
  let importAsDraft = shopifyInactive;
  let isActive = source.published && !shopifyInactive;

  if (softIncomplete && allowDraft) {
    importAsDraft = true;
    isActive = false;
    warnings.push("Unvollständig — wird als Entwurf (inaktiv) importiert.");
  } else if (softIncomplete && !allowDraft) {
    // Fehlende Preise ohne Draft-Flag erzeugen bereits errors oben
  }

  if (importAsDraft) {
    for (const v of variants) v.isActive = false;
  }

  return {
    sourceHandle: source.handle,
    slug,
    title: source.title.trim(),
    descriptionHtml: source.bodyHtml.trim() || null,
    vendor: source.vendor.trim() || null,
    productNumber,
    productType: source.productType.trim() || null,
    tags: source.tags,
    isActive,
    importAsDraft,
    leadText,
    weightText,
    materialText,
    dimensionsText,
    featureBullets,
    attributes,
    deliveryTimeKey,
    taxRatePercent,
    variants,
    images,
    warnings,
    errors,
  };
}

export function mapShopifyProductsToCatalog(
  sources: ShopifyParsedProduct[],
  options?: MapShopifyOptions,
): CatalogImportProduct[] {
  return sources.map((s) => mapShopifyProductToCatalog(s, options));
}
