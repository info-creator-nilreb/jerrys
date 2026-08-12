import { getPrisma } from "@/lib/db/prisma";
import { sanitizeProductDescriptionHtml } from "@/lib/catalog/sanitize-html";
import { parseShopifyProductCsv } from "@/features/catalog/domain/shopify-csv";
import {
  mapShopifyProductsToCatalog,
  type CatalogImportProduct,
  type MapShopifyOptions,
} from "@/features/catalog/domain/shopify-map";

export type ShopifyImportMode = "dry-run" | "apply";

export type ShopifyImportOptions = MapShopifyOptions & {
  mode: ShopifyImportMode;
  /** Bestehende Produkte/Varianten aktualisieren (nur apply). */
  updateExisting?: boolean;
  /**
   * Bei Dry-Run bestehende Slugs in der DB prüfen.
   * Default true; bei fehlender DB wird still auf reines Mapping zurückgefallen.
   */
  checkExistingInDb?: boolean;
};

export type ShopifyImportProductResult = {
  handle: string;
  slug: string;
  status:
    | "ok"
    | "invalid"
    | "would_create"
    | "would_skip"
    | "would_update"
    | "created"
    | "updated"
    | "skipped"
    | "error";
  errors: string[];
  warnings: string[];
  variantCount: number;
  imageCount: number;
  message?: string;
};

export type ShopifyImportReport = {
  mode: ShopifyImportMode;
  productCount: number;
  validCount: number;
  invalidCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  dbChecked: boolean;
  products: ShopifyImportProductResult[];
  mapped: CatalogImportProduct[];
};

function annotateCrossSkuConflicts(products: CatalogImportProduct[]): void {
  const skuToSlugs = new Map<string, string[]>();
  for (const p of products) {
    for (const v of p.variants) {
      const list = skuToSlugs.get(v.sku) ?? [];
      if (!list.includes(p.slug)) list.push(p.slug);
      skuToSlugs.set(v.sku, list);
    }
  }
  for (const p of products) {
    for (const v of p.variants) {
      const slugs = skuToSlugs.get(v.sku) ?? [];
      if (slugs.length > 1) {
        p.errors.push(
          `SKU „${v.sku}“ kommt in mehreren Handles vor: ${slugs.join(", ")}.`,
        );
      }
    }
  }
}

/** Reines Mapping + Validierung ohne Datenbank. */
export function planShopifyCsvImport(
  csvText: string,
  mapOptions: MapShopifyOptions = {},
): CatalogImportProduct[] {
  const parsed = parseShopifyProductCsv(csvText);
  const mapped = mapShopifyProductsToCatalog(parsed, mapOptions);
  annotateCrossSkuConflicts(mapped);
  return mapped;
}

async function tryFindProductIdBySlug(slug: string): Promise<string | null | undefined> {
  try {
    const prisma = getPrisma();
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing?.id ?? null;
  } catch {
    return undefined;
  }
}

async function ensureManufacturerId(name: string | null): Promise<string | null> {
  if (!name) return null;
  const prisma = getPrisma();
  const existing = await prisma.manufacturer.findFirst({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.manufacturer.create({
    data: { name, sortOrder: 0 },
    select: { id: true },
  });
  return created.id;
}

async function applyOne(
  draft: CatalogImportProduct,
  updateExisting: boolean,
): Promise<ShopifyImportProductResult> {
  const prisma = getPrisma();
  const base: Omit<ShopifyImportProductResult, "status" | "message"> = {
    handle: draft.sourceHandle,
    slug: draft.slug,
    errors: draft.errors,
    warnings: draft.warnings,
    variantCount: draft.variants.length,
    imageCount: draft.images.length,
  };

  if (draft.errors.length > 0) {
    return { ...base, status: "invalid" };
  }

  const existing = await prisma.product.findUnique({
    where: { slug: draft.slug },
    select: {
      id: true,
      variants: { select: { id: true, sku: true } },
    },
  });

  if (existing && !updateExisting) {
    return { ...base, status: "skipped", message: "Slug existiert (ohne --update)." };
  }

  for (const v of draft.variants) {
    const other = await prisma.productVariant.findUnique({
      where: { sku: v.sku },
      select: { productId: true },
    });
    if (other && (!existing || other.productId !== existing.id)) {
      return {
        ...base,
        status: "error",
        errors: [...draft.errors, `SKU „${v.sku}“ gehört bereits zu einem anderen Produkt.`],
      };
    }
  }

  const manufacturerId = await ensureManufacturerId(draft.vendor);
  const description = sanitizeProductDescriptionHtml(draft.descriptionHtml);

  try {
    if (!existing) {
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            slug: draft.slug,
            title: draft.title,
            description,
            manufacturerId,
            productNumber: draft.productNumber,
            isActive: draft.isActive,
            leadText: draft.leadText,
            weightText: draft.weightText,
            currency: "EUR",
          },
        });
        for (const v of draft.variants) {
          await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: v.sku,
              title: v.title,
              isDefault: v.isDefault,
              isActive: v.isActive,
              sortOrder: v.sortOrder,
              priceGrossCents: v.priceGrossCents,
              priceNetCents: v.priceNetCents,
              taxRatePercent: v.taxRatePercent,
              listPriceGrossCents: v.listPriceGrossCents,
              listPriceNetCents: v.listPriceNetCents,
              stockQuantity: v.stockQuantity,
              availableQuantity: v.availableQuantity,
              deliveryTimeKey: draft.deliveryTimeKey,
            },
          });
        }
        for (const img of draft.images) {
          await tx.productImage.create({
            data: {
              productId: product.id,
              url: img.url,
              alt: img.alt?.trim() || draft.title,
              sortOrder: img.sortOrder,
              isCover: img.isCover,
            },
          });
        }
      });
      return { ...base, status: "created" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          title: draft.title,
          description,
          manufacturerId,
          productNumber: draft.productNumber,
          isActive: draft.isActive,
          leadText: draft.leadText,
          weightText: draft.weightText,
        },
      });

      for (const v of draft.variants) {
        const found = existing.variants.find((x) => x.sku === v.sku);
        const data = {
          title: v.title,
          isDefault: v.isDefault,
          isActive: v.isActive,
          sortOrder: v.sortOrder,
          priceGrossCents: v.priceGrossCents,
          priceNetCents: v.priceNetCents,
          taxRatePercent: v.taxRatePercent,
          listPriceGrossCents: v.listPriceGrossCents,
          listPriceNetCents: v.listPriceNetCents,
          stockQuantity: v.stockQuantity,
          availableQuantity: v.availableQuantity,
          deliveryTimeKey: draft.deliveryTimeKey,
        };
        if (found) {
          await tx.productVariant.update({ where: { id: found.id }, data });
        } else {
          await tx.productVariant.create({
            data: { productId: existing.id, sku: v.sku, ...data },
          });
        }
      }

      await tx.productImage.deleteMany({ where: { productId: existing.id } });
      for (const img of draft.images) {
        await tx.productImage.create({
          data: {
            productId: existing.id,
            url: img.url,
            alt: img.alt?.trim() || draft.title,
            sortOrder: img.sortOrder,
            isCover: img.isCover,
          },
        });
      }
    });

    return { ...base, status: "updated" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ...base, status: "error", errors: [...draft.errors, message] };
  }
}

/**
 * Shopify-CSV → Katalog-Drafts → Dry-Run-Report oder DB-Apply.
 */
export async function importShopifyProductsFromCsv(
  csvText: string,
  options: ShopifyImportOptions,
): Promise<ShopifyImportReport> {
  const mapped = planShopifyCsvImport(csvText, options);
  const products: ShopifyImportProductResult[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let validCount = 0;
  let invalidCount = 0;
  let dbChecked = false;

  if (options.mode === "dry-run") {
    const wantDb = options.checkExistingInDb !== false;
    for (const draft of mapped) {
      if (draft.errors.length > 0) {
        invalidCount += 1;
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "invalid",
          errors: draft.errors,
          warnings: draft.warnings,
          variantCount: draft.variants.length,
          imageCount: draft.images.length,
        });
        continue;
      }
      validCount += 1;

      if (!wantDb) {
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "ok",
          errors: [],
          warnings: draft.warnings,
          variantCount: draft.variants.length,
          imageCount: draft.images.length,
        });
        continue;
      }

      const existingId = await tryFindProductIdBySlug(draft.slug);
      if (existingId === undefined) {
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "ok",
          errors: [],
          warnings: [
            ...draft.warnings,
            "Keine DB-Prüfung möglich (Verbindung/Env) — nur Mapping validiert.",
          ],
          variantCount: draft.variants.length,
          imageCount: draft.images.length,
        });
        continue;
      }

      dbChecked = true;
      if (existingId == null) {
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "would_create",
          errors: [],
          warnings: draft.warnings,
          variantCount: draft.variants.length,
          imageCount: draft.images.length,
        });
      } else if (options.updateExisting) {
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "would_update",
          errors: [],
          warnings: draft.warnings,
          variantCount: draft.variants.length,
          imageCount: draft.images.length,
        });
      } else {
        skippedCount += 1;
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "would_skip",
          errors: [],
          warnings: draft.warnings,
          variantCount: draft.variants.length,
          imageCount: draft.images.length,
          message: "Slug existiert (ohne --update).",
        });
      }
    }
  } else {
    dbChecked = true;
    for (const draft of mapped) {
      const result = await applyOne(draft, Boolean(options.updateExisting));
      products.push(result);
      if (result.status === "invalid") invalidCount += 1;
      else validCount += 1;
      if (result.status === "created") createdCount += 1;
      if (result.status === "updated") updatedCount += 1;
      if (result.status === "skipped") skippedCount += 1;
    }
  }

  return {
    mode: options.mode,
    productCount: mapped.length,
    validCount,
    invalidCount,
    createdCount,
    updatedCount,
    skippedCount,
    dbChecked,
    products,
    mapped,
  };
}
