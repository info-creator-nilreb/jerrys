import { getPrisma } from "@/lib/db/prisma";
import { sanitizeProductDescriptionHtml } from "@/lib/catalog/sanitize-html";
import { parseShopifyProductCsv } from "@/features/catalog/domain/shopify-csv";
import {
  mapShopifyProductsToCatalog,
  type CatalogImportProduct,
  type CatalogImportVariant,
  type MapShopifyOptions,
} from "@/features/catalog/domain/shopify-map";
import { technicalImportSku } from "@/features/catalog/domain/product-attributes";
import type { Prisma } from "@/app/generated/prisma/client";

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
  /** Remote-Bilder (Shopify-CDN) nach Blob/lokal spiegeln (nur apply). */
  mirrorImages?: boolean;
};

export type ShopifyImportProductResult = {
  handle: string;
  slug: string;
  /** Nach create/update gesetzt — für Admin-Links. */
  productId?: string;
  /** Shop-PDP nur bei aktiven Produkten erreichbar. */
  isActive?: boolean;
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
      if (v.skuMissing || !v.sku.trim()) continue;
      const list = skuToSlugs.get(v.sku) ?? [];
      if (!list.includes(p.slug)) list.push(p.slug);
      skuToSlugs.set(v.sku, list);
    }
  }
  for (const p of products) {
    for (const v of p.variants) {
      if (v.skuMissing || !v.sku.trim()) continue;
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

async function resolveImagesForProduct(
  draft: CatalogImportProduct,
  productId: string,
  mirrorImages: boolean,
): Promise<{ url: string; alt: string; sortOrder: number; isCover: boolean }[]> {
  const out: { url: string; alt: string; sortOrder: number; isCover: boolean }[] = [];
  let mirrorMod: typeof import("@/features/catalog/application/mirror-remote-product-image") | null =
    null;
  if (mirrorImages) {
    try {
      mirrorMod = await import("@/features/catalog/application/mirror-remote-product-image");
    } catch {
      draft.warnings.push(
        "Bild-Spiegel-Modul nicht ladbar — Shopify-URLs werden übernommen.",
      );
      mirrorMod = null;
    }
  }

  for (const img of draft.images) {
    let url = img.url;
    if (mirrorMod && /^https?:\/\//i.test(img.url)) {
      try {
        const mirrored = await mirrorMod.mirrorRemoteProductImage(img.url, productId);
        if (mirrored.ok) {
          url = mirrored.url;
          draft.warnings.push(`Bild gespiegelt (${mirrored.storage}).`);
        } else {
          draft.warnings.push(`Bild nicht gespiegelt: ${mirrored.error}`);
          // keepRemoteUrl default true — Remote-URL behalten, Produkt trotzdem mit Bild
        }
      } catch {
        draft.warnings.push("Bild-Spiegelung abgebrochen — Shopify-URL belassen.");
      }
    }
    out.push({
      url,
      alt: img.alt?.trim() || draft.title,
      sortOrder: img.sortOrder,
      isCover: img.isCover,
    });
  }
  if (out.length > 0 && !out.some((i) => i.isCover)) {
    out[0]!.isCover = true;
  }
  return out;
}

function productContentData(draft: CatalogImportProduct, description: string | null, manufacturerId: string | null) {
  return {
    title: draft.title,
    description,
    manufacturerId,
    productNumber: draft.productNumber,
    isActive: draft.isActive,
    leadText: draft.leadText,
    weightText: draft.weightText,
    materialText: draft.materialText,
    dimensionsText: draft.dimensionsText,
    featureBullets: draft.featureBullets,
    attributes: draft.attributes as unknown as Prisma.InputJsonValue,
  };
}

type ExistingVariantRow = {
  id: string;
  sku: string;
  title: string | null;
  sortOrder: number;
  isDefault: boolean;
};

function resolvePersistSku(
  draft: CatalogImportVariant,
  productId: string,
  index: number,
  total: number,
  existing: ExistingVariantRow[],
  usedSkus: Set<string>,
): { sku: string; existingId?: string } {
  if (!draft.skuMissing && draft.sku.trim()) {
    const found = existing.find((x) => x.sku === draft.sku);
    usedSkus.add(draft.sku);
    return { sku: draft.sku, existingId: found?.id };
  }
  const byOrder = existing.find(
    (x) => x.sortOrder === draft.sortOrder && !usedSkus.has(x.sku),
  );
  if (byOrder) {
    usedSkus.add(byOrder.sku);
    return { sku: byOrder.sku, existingId: byOrder.id };
  }
  const byDefault =
    draft.isDefault
      ? existing.find((x) => x.isDefault && !usedSkus.has(x.sku))
      : undefined;
  if (byDefault) {
    usedSkus.add(byDefault.sku);
    return { sku: byDefault.sku, existingId: byDefault.id };
  }
  const byTitle =
    draft.title != null
      ? existing.find((x) => x.title === draft.title && !usedSkus.has(x.sku))
      : undefined;
  if (byTitle) {
    usedSkus.add(byTitle.sku);
    return { sku: byTitle.sku, existingId: byTitle.id };
  }
  return { sku: technicalImportSku(productId, index, total, usedSkus) };
}

async function applyOne(
  draft: CatalogImportProduct,
  updateExisting: boolean,
  mirrorImages: boolean,
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
      variants: {
        select: { id: true, sku: true, title: true, sortOrder: true, isDefault: true },
      },
    },
  });

  if (existing && !updateExisting) {
    return { ...base, status: "skipped", message: "Slug existiert (ohne --update)." };
  }

  for (const v of draft.variants) {
    if (v.skuMissing || !v.sku.trim()) continue;
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
      const product = await prisma.product.create({
        data: {
          slug: draft.slug,
          currency: "EUR",
          ...productContentData(draft, description, manufacturerId),
        },
      });
      const usedSkus = new Set<string>();
      const total = draft.variants.length;
      for (let i = 0; i < draft.variants.length; i++) {
        const v = draft.variants[i]!;
        const { sku } = resolvePersistSku(v, product.id, i, total, [], usedSkus);
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
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
      const images = await resolveImagesForProduct(draft, product.id, mirrorImages);
      for (const img of images) {
        await prisma.productImage.create({
          data: { productId: product.id, ...img },
        });
      }
      return {
        ...base,
        status: "created",
        productId: product.id,
        isActive: draft.isActive,
        warnings: draft.warnings,
        imageCount: images.length,
        message: draft.importAsDraft ? "Als Entwurf (inaktiv) angelegt." : undefined,
      };
    }

    await prisma.product.update({
      where: { id: existing.id },
      data: productContentData(draft, description, manufacturerId),
    });

    const usedSkus = new Set<string>();
    const total = draft.variants.length;
    for (let i = 0; i < draft.variants.length; i++) {
      const v = draft.variants[i]!;
      const resolved = resolvePersistSku(v, existing.id, i, total, existing.variants, usedSkus);
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
      if (resolved.existingId) {
        await prisma.productVariant.update({
          where: { id: resolved.existingId },
          data,
        });
      } else {
        await prisma.productVariant.create({
          data: { productId: existing.id, sku: resolved.sku, ...data },
        });
      }
    }

    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    const images = await resolveImagesForProduct(draft, existing.id, mirrorImages);
    for (const img of images) {
      await prisma.productImage.create({
        data: { productId: existing.id, ...img },
      });
    }

    return {
      ...base,
      status: "updated",
      productId: existing.id,
      isActive: draft.isActive,
      warnings: draft.warnings,
      imageCount: images.length,
      message: draft.importAsDraft ? "Als Entwurf (inaktiv) aktualisiert." : undefined,
    };
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
  const mirrorImages = Boolean(options.mirrorImages);

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

      const draftNote = draft.importAsDraft
        ? ["Würde als Entwurf (inaktiv) gespeichert."]
        : [];
      const mirrorNote = mirrorImages
        ? ["Bilder würden beim Import gespiegelt (Blob oder lokal)."]
        : [];

      if (!wantDb) {
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "ok",
          errors: [],
          warnings: [...draft.warnings, ...draftNote, ...mirrorNote],
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
            ...draftNote,
            ...mirrorNote,
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
          warnings: [...draft.warnings, ...draftNote, ...mirrorNote],
          variantCount: draft.variants.length,
          imageCount: draft.images.length,
        });
      } else if (options.updateExisting) {
        products.push({
          handle: draft.sourceHandle,
          slug: draft.slug,
          status: "would_update",
          errors: [],
          warnings: [...draft.warnings, ...draftNote, ...mirrorNote],
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
      const result = await applyOne(draft, Boolean(options.updateExisting), mirrorImages);
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
