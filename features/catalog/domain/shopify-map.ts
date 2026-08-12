import { netCentsFromGross } from "@/lib/catalog/pricing";
import { productSlugSchema } from "@/lib/catalog/schemas";
import type { DeliveryTimeKey } from "@/lib/catalog/delivery-options";
import { DELIVERY_TIME_OPTIONS } from "@/lib/catalog/delivery-options";
import type { ShopifyParsedProduct } from "@/features/catalog/domain/shopify-csv";

export type CatalogImportImage = {
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type CatalogImportVariant = {
  sku: string;
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
  leadText: string | null;
  weightText: string | null;
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

export function mapShopifyProductToCatalog(
  source: ShopifyParsedProduct,
  options: MapShopifyOptions = {},
): CatalogImportProduct {
  const taxRatePercent = options.taxRatePercent ?? 19;
  const deliveryTimeKey =
    options.deliveryTimeKey ??
    (DELIVERY_TIME_OPTIONS.find((o) => o.value === "2-4-werktage")?.value as DeliveryTimeKey);
  const warnings: string[] = [];
  const errors: string[] = [];

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
      `Product Type „${source.productType}“: kein Auto-Mapping auf Category (siehe Mapping-Datei).`,
    );
  }
  if (source.tags.length > 0) {
    warnings.push(
      `Tags (${source.tags.length}): kein Tag-Modell — manuelles Collection-/Bullet-Mapping nötig.`,
    );
  }

  const variants: CatalogImportVariant[] = [];
  let weightText: string | null = null;

  source.variants.forEach((v, index) => {
    const sku = v.sku.trim();
    if (!sku) {
      errors.push(`Variante #${index + 1}: SKU fehlt.`);
      return;
    }
    const gross = decimalToCents(v.price);
    if (gross == null) {
      errors.push(`Variante ${sku}: ungültiger Preis „${v.price}“.`);
      return;
    }
    const compare = decimalToCents(v.compareAtPrice);
    let listGross: number | null = null;
    let listNet: number | null = null;
    if (compare != null && compare > gross) {
      listGross = compare;
      listNet = netCentsFromGross(compare, taxRatePercent);
    } else if (compare != null && compare > 0 && compare <= gross) {
      warnings.push(`Variante ${sku}: Compare-at ≤ Preis — Listenpreis ignoriert.`);
    }

    const qtyRaw = v.inventoryQty.trim();
    let qty = 0;
    if (qtyRaw !== "") {
      const n = Number(qtyRaw);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        errors.push(`Variante ${sku}: ungültiger Bestand „${v.inventoryQty}“.`);
        return;
      }
      qty = n;
    }

    if (v.inventoryPolicy.toLowerCase() === "continue") {
      warnings.push(
        `Variante ${sku}: Inventory Policy „continue“ (Verkauf ohne Stock) — hier strikter Bestand.`,
      );
    }
    if (v.variantImageUrl) {
      warnings.push(`Variante ${sku}: Variant Image — kein Varianten-Medienmodell; am Produkt prüfen.`);
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
      title: variantTitle(v.optionValues),
      isDefault,
      isActive: source.published,
      sortOrder: index,
      priceGrossCents: gross,
      priceNetCents: netCentsFromGross(gross, taxRatePercent),
      taxRatePercent,
      listPriceGrossCents: listGross,
      listPriceNetCents: listNet,
      stockQuantity: qty,
      availableQuantity: qty,
    });
  });

  if (variants.length === 0) {
    errors.push("Keine Varianten mit gültiger SKU/Preis.");
  } else if (!variants.some((v) => v.isDefault)) {
    variants[0]!.isDefault = true;
    warnings.push("Keine Default-Variante erkannt — erste Variante als Default gesetzt.");
  } else {
    // Genau eine Default-Variante
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
    warnings.push("Keine Bilder — Cover fehlt (Admin verlangt Cover beim manuellen Anlegen).");
  } else {
    warnings.push(
      "Bild-URLs zeigen noch auf Shopify-CDN; für Produktion nach Object Storage spiegeln.",
    );
  }

  const productNumber = variants[0]?.sku ?? null;

  return {
    sourceHandle: source.handle,
    slug,
    title: source.title.trim(),
    descriptionHtml: source.bodyHtml.trim() || null,
    vendor: source.vendor.trim() || null,
    productNumber,
    productType: source.productType.trim() || null,
    tags: source.tags,
    isActive: source.published,
    leadText,
    weightText,
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
