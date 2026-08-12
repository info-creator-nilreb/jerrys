import { csvRowsToObjects, parseCsv } from "@/features/catalog/domain/parse-csv";

/** Rohe Shopify-Produktzeile (CSV-Spalten, englische Export-Header). */
export type ShopifyCsvRow = {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  Type: string;
  Tags: string;
  Published: string;
  Status: string;
  "Option1 Name": string;
  "Option1 Value": string;
  "Option2 Name": string;
  "Option2 Value": string;
  "Option3 Name": string;
  "Option3 Value": string;
  "Variant SKU": string;
  "Variant Grams": string;
  "Variant Inventory Qty": string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Variant Inventory Policy": string;
  "Image Src": string;
  "Image Position": string;
  "Image Alt Text": string;
  "Variant Image": string;
  "SEO Title": string;
  "SEO Description": string;
  [key: string]: string;
};

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

export type ShopifyParsedProduct = {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  published: boolean;
  status: string;
  seoTitle: string;
  seoDescription: string;
  variants: ShopifyParsedVariant[];
  images: ShopifyParsedImage[];
};

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (key in row && row[key] != null) return String(row[key]).trim();
  }
  return "";
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
        tags: [],
        published: true,
        status: "",
        seoTitle: "",
        seoDescription: "",
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
      product.productType = cell(raw, "Type", "Product Category");
      product.tags = parseTags(cell(raw, "Tags"));
      product.published = isPublished(raw);
      product.status = cell(raw, "Status") || (product.published ? "active" : "draft");
      product.seoTitle = cell(raw, "SEO Title");
      product.seoDescription = cell(raw, "SEO Description");
    } else if (!product.title && title) {
      product.title = title;
    }

    // Spätere Zeilen können Published/Status noch setzen, wenn erste Bild-only war
    if (!product.title) {
      if (cell(raw, "Status") || cell(raw, "Published")) {
        product.published = isPublished(raw);
        product.status = cell(raw, "Status");
      }
    }

    const sku = cell(raw, "Variant SKU");
    const price = cell(raw, "Variant Price");
    const hasVariantSignal =
      Boolean(sku) ||
      Boolean(price) ||
      Boolean(cell(raw, "Option1 Value")) ||
      cell(raw, "Variant Inventory Qty") !== "";

    if (hasVariantSignal) {
      const already = sku
        ? product.variants.some((v) => v.sku === sku)
        : false;
      if (!already) {
        product.variants.push({
          sku,
          optionValues: optionValues(raw),
          price,
          compareAtPrice: cell(raw, "Variant Compare At Price"),
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
