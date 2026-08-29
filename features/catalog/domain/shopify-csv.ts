import { csvRowsToObjects, parseCsv } from "@/features/catalog/domain/parse-csv";
import {
  extractAttributesFromShopifyRow,
  mergeProductAttributes,
  type ProductAttribute,
} from "@/features/catalog/domain/product-attributes";

export type ShopifyParsedImage = {
  url: string;
  alt: string | null;
  position: number;
};

export type ShopifyParsedVariant = {
  sku: string;
  optionValues: string[];
  price: string;
  compareAtPrice: string;
  inventoryQty: string;
  grams: string;
  inventoryPolicy: string;
  variantImageUrl: string | null;
};

export type ShopifyParsedMetafields = {
  material: string;
  dimensions: string;
  deliveryNote: string;
  color: string;
  countryOfOrigin: string;
};

export type ShopifyParsedProduct = {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  /** Shopify „Type“ (frei); nicht Google Product Category. */
  productType: string;
  googleProductCategory: string;
  tags: string[];
  published: boolean;
  status: string;
  seoTitle: string;
  seoDescription: string;
  metafields: ShopifyParsedMetafields;
  /** Kategorie-/Custom-Metafelder analog Shopify-Merkmale. */
  attributes: ProductAttribute[];
  variants: ShopifyParsedVariant[];
  images: ShopifyParsedImage[];
};

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (key in row && row[key] != null) return String(row[key]).trim();
  }
  return "";
}

/** Metafield-Spalten: bevorzugt `custom.*`, sonst erster Treffer. */
function metafieldCell(row: Record<string, string>, needle: string): string {
  const lower = needle.toLowerCase();
  let fallback = "";
  for (const [key, value] of Object.entries(row)) {
    const v = String(value ?? "").trim();
    if (!v) continue;
    const k = key.toLowerCase();
    if (!k.includes(lower)) continue;
    if (k.includes("metafields.custom.")) return v;
    if (!fallback) fallback = v;
  }
  return fallback;
}

function parseTags(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function isPublished(row: Record<string, string>): boolean {
  const status = cell(row, "Status").toLowerCase();
  if (status === "active") return true;
  if (status === "draft" || status === "archived") return false;
  const published = cell(row, "Published").toLowerCase();
  return published === "true" || published === "1" || published === "yes";
}

function optionValues(row: Record<string, string>): string[] {
  return [
    cell(row, "Option1 Value"),
    cell(row, "Option2 Value"),
    cell(row, "Option3 Value"),
  ].filter(Boolean);
}

function emptyMetafields(): ShopifyParsedMetafields {
  return {
    material: "",
    dimensions: "",
    deliveryNote: "",
    color: "",
    countryOfOrigin: "",
  };
}

function readMetafields(row: Record<string, string>): ShopifyParsedMetafields {
  return {
    material: metafieldCell(row, "custom.material") || metafieldCell(row, ".material)"),
    dimensions:
      metafieldCell(row, "custom.ma_e") ||
      metafieldCell(row, "custom.masse") ||
      metafieldCell(row, "maße") ||
      metafieldCell(row, "ma_e"),
    deliveryNote:
      metafieldCell(row, "custom.lieferzeit") || metafieldCell(row, "lieferzeit"),
    color: metafieldCell(row, "custom.farbe") || metafieldCell(row, "color-pattern"),
    countryOfOrigin:
      metafieldCell(row, "custom.herstellungsland") ||
      metafieldCell(row, "herstellungsland") ||
      metafieldCell(row, "custom.herkunft") ||
      metafieldCell(row, "herkunft"),
  };
}

/**
 * Gruppiert Shopify-CSV-Zeilen nach Handle.
 * Produktfelder kommen aus der ersten Zeile mit Titel; Varianten/Bilder aus allen Zeilen.
 */
export function parseShopifyProductCsv(csvText: string): ShopifyParsedProduct[] {
  const rows = csvRowsToObjects(parseCsv(csvText));
  const byHandle = new Map<string, ShopifyParsedProduct>();
  const order: string[] = [];

  for (const raw of rows) {
    const handle = cell(raw, "Handle").toLowerCase();
    if (!handle) continue;

    let product = byHandle.get(handle);
    if (!product) {
      product = {
        handle,
        title: "",
        bodyHtml: "",
        vendor: "",
        productType: "",
        googleProductCategory: "",
        tags: [],
        published: true,
        status: "",
        seoTitle: "",
        seoDescription: "",
        metafields: emptyMetafields(),
        attributes: [],
        variants: [],
        images: [],
      };
      byHandle.set(handle, product);
      order.push(handle);
    }

    const title = cell(raw, "Title");
    if (title && !product.title) {
      product.title = title;
      product.bodyHtml = cell(raw, "Body (HTML)", "Body HTML");
      product.vendor = cell(raw, "Vendor");
      product.productType = cell(raw, "Type");
      product.googleProductCategory = cell(raw, "Product Category");
      product.tags = parseTags(cell(raw, "Tags"));
      product.published = isPublished(raw);
      product.status = cell(raw, "Status") || (product.published ? "active" : "draft");
      product.seoTitle = cell(raw, "SEO Title");
      product.seoDescription = cell(raw, "SEO Description");
      product.metafields = readMetafields(raw);
    } else if (!product.title && title) {
      product.title = title;
    }

    if (!product.title) {
      if (cell(raw, "Status") || cell(raw, "Published")) {
        product.published = isPublished(raw);
        product.status = cell(raw, "Status");
      }
    }

    // Metafields können auf Folgetzeilen fehlen — erste nicht-leere Werte behalten
    const mf = readMetafields(raw);
    for (const key of Object.keys(mf) as (keyof ShopifyParsedMetafields)[]) {
      if (!product.metafields[key] && mf[key]) product.metafields[key] = mf[key];
    }
    product.attributes = mergeProductAttributes(
      product.attributes,
      extractAttributesFromShopifyRow(raw),
    );

    const sku = cell(raw, "Variant SKU");
    const price = cell(raw, "Variant Price") || cell(raw, "Price / Deutschland");
    const opts = optionValues(raw);
    const hasVariantSignal =
      Boolean(sku) ||
      Boolean(price) ||
      Boolean(opts.length) ||
      cell(raw, "Variant Inventory Qty") !== "";

    if (hasVariantSignal) {
      const optionKey = opts.join("\0");
      const already = product.variants.some((v) => {
        if (sku && v.sku === sku) return true;
        if (!sku && v.optionValues.join("\0") === optionKey && optionKey !== "") return true;
        return false;
      });
      if (!already) {
        product.variants.push({
          sku,
          optionValues: opts,
          price,
          compareAtPrice:
            cell(raw, "Variant Compare At Price") ||
            cell(raw, "Compare At Price / Deutschland"),
          inventoryQty: cell(raw, "Variant Inventory Qty"),
          grams: cell(raw, "Variant Grams"),
          inventoryPolicy: cell(raw, "Variant Inventory Policy"),
          variantImageUrl: cell(raw, "Variant Image") || null,
        });
      }
    }

    const imageSrc = cell(raw, "Image Src");
    if (imageSrc && !product.images.some((img) => img.url === imageSrc)) {
      const posRaw = cell(raw, "Image Position");
      const position = posRaw ? Number(posRaw) : product.images.length + 1;
      product.images.push({
        url: imageSrc,
        alt: cell(raw, "Image Alt Text") || null,
        position: Number.isFinite(position) ? position : product.images.length + 1,
      });
    }
  }

  return order.map((h) => {
    const p = byHandle.get(h)!;
    p.images.sort((a, b) => a.position - b.position);
    return p;
  });
}
