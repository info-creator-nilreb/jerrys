"use server";

import { existsSync } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { updateStorefrontCatalogCacheTag } from "@/lib/catalog/storefront-catalog-cache";
import {
  attributesFromFormData,
  reconcileAttributesAndFeatureBullets,
} from "@/features/catalog";
import {
  persistProductImageUpload,
  syncDefaultVariantFromProduct,
} from "@/features/catalog/server";
import { getObjectStorage } from "@/features/integrations";
import {
  coupledStockAfterPhysicalEdit,
  initialCoupledStock,
} from "@/features/inventory";
import { parseEuroInputToCents } from "@/lib/catalog/format";
import {
  createProductFormSchema,
  productCoreSchema,
  productImageSchema,
} from "@/lib/catalog/schemas";
import { sanitizeProductDescriptionHtml } from "@/lib/catalog/sanitize-html";
import {
  mergeAttributesWithStandardForm,
  migrateLegacySpecsIntoAttributes,
  specTextsFromAttributes,
} from "@/lib/catalog/standard-product-attributes";
import { syncProductShopMemberships } from "@/lib/catalog/product-shop-membership";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/admin/upload-image";
import { isManagedBlobUrl } from "@/lib/shop/branding-asset-fallbacks";
import {
  DEFAULT_PICKUP_READY_HOURS,
  getPickupStoreById,
} from "@/lib/shop/pickup-stores";
import { nonEmptyString } from "@/lib/validation/form";

function formIdList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

async function resolveProductPickupFields(
  pickupStoreId: string | null,
  pickupReadyHours: number | null,
): Promise<
  | {
      pickupStoreId: string | null;
      pickupReadyHours: number | null;
      pickupAvailable: boolean;
    }
  | { fieldErrors: Record<string, string> }
> {
  if (!pickupStoreId) {
    return { pickupStoreId: null, pickupReadyHours: null, pickupAvailable: false };
  }
  const store = await getPickupStoreById(pickupStoreId);
  if (!store) {
    return { fieldErrors: { pickupStoreId: "Abholort nicht gefunden." } };
  }
  if (!store.isActive) {
    return { fieldErrors: { pickupStoreId: "Abholort ist inaktiv — bitte anderen Store wählen." } };
  }
  return {
    pickupStoreId,
    pickupReadyHours: pickupReadyHours ?? DEFAULT_PICKUP_READY_HOURS,
    pickupAvailable: true,
  };
}

function reconcileProductAttributesForSave(
  formData: FormData,
  attributes: ReturnType<typeof attributesFromFormData>,
  featureBullets: string[],
) {
  const merged = mergeAttributesWithStandardForm(formData, attributes);
  const migrated = migrateLegacySpecsIntoAttributes(merged);
  return reconcileAttributesAndFeatureBullets(migrated, featureBullets);
}

function legacySpecTextsForPrisma(attributes: ReturnType<typeof reconcileAttributesAndFeatureBullets>["attributes"]) {
  const texts = specTextsFromAttributes(attributes);
  return {
    dimensionsText: texts.dimensionsText,
    weightText: texts.weightText,
    materialText: texts.materialText,
  };
}

/** USPs: zeilenweise `featureBullet` (neu) oder Newline-Textarea `featureBullets` (Fallback). */
function featureBulletsFromFormData(formData: FormData): string {
  const rows = formIdList(formData, "featureBullet");
  if (rows.length > 0) return rows.join("\n");
  return String(formData.get("featureBullets") ?? "");
}

const log = createLogger("admin.products");

function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

/** Checkbox „on“ oder Auswahl „true“ / „false“. */
function parseIsActiveFromFormData(formData: FormData): boolean {
  const v = formData.get("isActive");
  if (v === "on") return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }
  return false;
}

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

/** Aus validierten Formular-Rohwerten für Prisma (Sterne optional, Link optional). */
function amazonFieldsForPrisma(d: {
  amazonRatingAverage: string;
  amazonRatingCount: string;
  amazonReviewUrl: string;
}) {
  const avgS = d.amazonRatingAverage.trim().replace(",", ".");
  const cntS = d.amazonRatingCount.trim();
  const url = d.amazonReviewUrl.trim() === "" ? null : d.amazonReviewUrl.trim();
  if (avgS === "") {
    return {
      amazonRatingAverage: null as number | null,
      amazonRatingCount: null as number | null,
      amazonReviewUrl: url,
    };
  }
  return {
    amazonRatingAverage: Math.round(Number(avgS) * 100) / 100,
    amazonRatingCount: parseInt(cntS, 10),
    amazonReviewUrl: url,
  };
}

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  /** Einmaliger Stempel, damit Client-Effects bei wiederholtem ok:true erneut laufen. */
  revision?: number;
  /** Welche Medien-Aktion erfolgreich war (für UI-Feedback). */
  mediaIntent?: "delete" | "cover";
} | null;

const updateProductFormSchema = productCoreSchema.and(
  z.object({
    id: nonEmptyString,
  }),
);

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const raw = {
    title: formData.get("title"),
    slug: formData.get("slug"),
    subtitle: formData.get("subtitle"),
    descriptionHtml: formData.get("descriptionHtml"),
    manufacturerId: formData.get("manufacturerId"),
    productNumber: formData.get("productNumber"),
    sku: String(formData.get("sku") ?? ""),
    taxRatePercent: formData.get("taxRatePercent"),
    priceGrossEuro: formData.get("priceGrossEuro"),
    priceNetEuro: formData.get("priceNetEuro"),
    listPriceGrossEuro: formData.get("listPriceGrossEuro") ?? "",
    listPriceNetEuro: formData.get("listPriceNetEuro") ?? "",
    lowest30GrossEuro: formData.get("lowest30GrossEuro") ?? "",
    lowest30NetEuro: formData.get("lowest30NetEuro") ?? "",
    stockQuantity: formData.get("stockQuantity"),
    deliveryTimeKey: formData.get("deliveryTimeKey"),
    restockDays: formData.get("restockDays"),
    minOrderQty: formData.get("minOrderQty"),
    purchaseStep: formData.get("purchaseStep"),
    maxOrderQty: formData.get("maxOrderQty"),
    amazonRatingAverage: formData.get("amazonRatingAverage") ?? "",
    amazonRatingCount: formData.get("amazonRatingCount") ?? "",
    amazonReviewUrl: formData.get("amazonReviewUrl") ?? "",
    leadText: String(formData.get("leadText") ?? ""),
    variantOptionName: String(formData.get("variantOptionName") ?? ""),
    featureBullets: featureBulletsFromFormData(formData),
    attributes: attributesFromFormData(formData),
    showWorkshopCalendar: formData.get("showWorkshopCalendar") === "on",
    pickupStoreId: String(formData.get("pickupStoreId") ?? ""),
    pickupReadyHours: formData.get("pickupReadyHours"),
    imageUrl: formData.get("imageUrl"),
    imageAlt: formData.get("imageAlt"),
    isActive: parseIsActiveFromFormData(formData),
  };

  const categoryIds = formIdList(formData, "categoryIds");
  const extraCollectionIds = formIdList(formData, "extraCollectionIds");

  const parsed = createProductFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const pickupFields = await resolveProductPickupFields(d.pickupStoreId, d.pickupReadyHours);
  if ("fieldErrors" in pickupFields) {
    return { fieldErrors: pickupFields.fieldErrors };
  }
  const reconciled = reconcileProductAttributesForSave(
    formData,
    d.attributes,
    d.featureBullets,
  );
  const legacySpecs = legacySpecTextsForPrisma(reconciled.attributes);
  const mainGross = parseEuroInputToCents(d.priceGrossEuro)!;
  const mainNet = parseEuroInputToCents(d.priceNetEuro)!;
  const listGross = d.listPriceGrossEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceGrossEuro);
  const listNet = d.listPriceNetEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceNetEuro);
  const lowGross = d.lowest30GrossEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30GrossEuro);
  const lowNet = d.lowest30NetEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30NetEuro);
  const description = sanitizeProductDescriptionHtml(d.descriptionHtml);
  const amazon = amazonFieldsForPrisma(d);

  const coupledStock = initialCoupledStock(d.stockQuantity);

  const variantMirror = {
    taxRatePercent: d.taxRatePercent,
    priceGrossCents: mainGross,
    priceNetCents: mainNet,
    listPriceGrossCents: listGross,
    listPriceNetCents: listNet,
    lowestPrice30dGrossCents: lowGross,
    lowestPrice30dNetCents: lowNet,
    stockQuantity: coupledStock.stockQuantity,
    availableQuantity: coupledStock.availableQuantity,
    deliveryTimeKey: d.deliveryTimeKey,
    restockDays: d.restockDays,
    minOrderQty: d.minOrderQty,
    purchaseStep: d.purchaseStep,
    maxOrderQty: d.maxOrderQty,
    isActive: d.isActive,
  };

  try {
    await getPrisma().$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          title: d.title,
          slug: d.slug,
          subtitle: d.subtitle,
          description,
          manufacturerId: d.manufacturerId,
          productNumber: d.productNumber,
          isActive: d.isActive,
          showWorkshopCalendar: d.showWorkshopCalendar,
          pickupAvailable: pickupFields.pickupAvailable,
          pickupStoreId: pickupFields.pickupStoreId,
          pickupReadyHours: pickupFields.pickupReadyHours,
          leadText: d.leadText,
          variantOptionName: d.variantOptionName,
          dimensionsText: legacySpecs.dimensionsText,
          weightText: legacySpecs.weightText,
          materialText: legacySpecs.materialText,
          featureBullets: reconciled.featureBullets,
          attributes: reconciled.attributes,
          ...amazon,
          images: {
            create: [
              {
                url: d.imageUrl,
                alt: d.imageAlt,
                sortOrder: 0,
                isCover: true,
              },
            ],
          },
        },
      });
      await syncDefaultVariantFromProduct(tx, {
        id: created.id,
        productNumber: d.productNumber,
        sku: d.sku,
        ...variantMirror,
      });
      await syncProductShopMemberships(tx, created.id, {
        categoryIds,
        extraCollectionIds,
      });
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      const msg = String((e as { meta?: { target?: string[] } }).meta?.target ?? []);
      if (msg.includes("sku") || /sku/i.test(String(e))) {
        return { fieldErrors: { sku: "Diese SKU ist bereits vergeben." } };
      }
      return { error: "Dieser Slug oder diese SKU ist bereits vergeben." };
    }
    throw e;
  }

  updateStorefrontCatalogCacheTag();
  revalidatePath("/");
  revalidatePath("/produkte");
  revalidatePath("/kategorien");
  revalidatePath("/kollektionen");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/collections");
  redirect("/admin/products");
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const raw = {
    id: formData.get("id"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    subtitle: formData.get("subtitle"),
    descriptionHtml: formData.get("descriptionHtml"),
    manufacturerId: formData.get("manufacturerId"),
    productNumber: formData.get("productNumber"),
    sku: String(formData.get("sku") ?? ""),
    taxRatePercent: formData.get("taxRatePercent"),
    priceGrossEuro: formData.get("priceGrossEuro"),
    priceNetEuro: formData.get("priceNetEuro"),
    listPriceGrossEuro: formData.get("listPriceGrossEuro") ?? "",
    listPriceNetEuro: formData.get("listPriceNetEuro") ?? "",
    lowest30GrossEuro: formData.get("lowest30GrossEuro") ?? "",
    lowest30NetEuro: formData.get("lowest30NetEuro") ?? "",
    stockQuantity: formData.get("stockQuantity"),
    deliveryTimeKey: formData.get("deliveryTimeKey"),
    restockDays: formData.get("restockDays"),
    minOrderQty: formData.get("minOrderQty"),
    purchaseStep: formData.get("purchaseStep"),
    maxOrderQty: formData.get("maxOrderQty"),
    amazonRatingAverage: formData.get("amazonRatingAverage") ?? "",
    amazonRatingCount: formData.get("amazonRatingCount") ?? "",
    amazonReviewUrl: formData.get("amazonReviewUrl") ?? "",
    leadText: String(formData.get("leadText") ?? ""),
    variantOptionName: String(formData.get("variantOptionName") ?? ""),
    featureBullets: featureBulletsFromFormData(formData),
    attributes: attributesFromFormData(formData),
    showWorkshopCalendar: formData.get("showWorkshopCalendar") === "on",
    pickupStoreId: String(formData.get("pickupStoreId") ?? ""),
    pickupReadyHours: formData.get("pickupReadyHours"),
    isActive: parseIsActiveFromFormData(formData),
  };

  const categoryIds = formIdList(formData, "categoryIds");
  const extraCollectionIds = formIdList(formData, "extraCollectionIds");

  const parsed = updateProductFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const pickupFields = await resolveProductPickupFields(d.pickupStoreId, d.pickupReadyHours);
  if ("fieldErrors" in pickupFields) {
    return { fieldErrors: pickupFields.fieldErrors };
  }
  const reconciled = reconcileProductAttributesForSave(
    formData,
    d.attributes,
    d.featureBullets,
  );
  const legacySpecs = legacySpecTextsForPrisma(reconciled.attributes);
  const mainGross = parseEuroInputToCents(d.priceGrossEuro)!;
  const mainNet = parseEuroInputToCents(d.priceNetEuro)!;
  const listGross = d.listPriceGrossEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceGrossEuro);
  const listNet = d.listPriceNetEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceNetEuro);
  const lowGross = d.lowest30GrossEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30GrossEuro);
  const lowNet = d.lowest30NetEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30NetEuro);
  const description = sanitizeProductDescriptionHtml(d.descriptionHtml);
  const amazon = amazonFieldsForPrisma(d);

  const existing = await getPrisma().product.findUnique({
    where: { id: d.id },
    select: { id: true, slug: true, previousSlug: true },
  });
  if (!existing) {
    return { error: "Produkt nicht gefunden." };
  }

  const slugChanged = existing.slug !== d.slug;
  let previousSlugForUpdate: string | null = existing.previousSlug;
  if (slugChanged) {
    previousSlugForUpdate = existing.slug;
  } else if (previousSlugForUpdate === d.slug) {
    previousSlugForUpdate = null;
  }

  const defaultVariant = await getPrisma().productVariant.findFirst({
    where: { productId: d.id, isDefault: true },
    select: { stockQuantity: true, availableQuantity: true },
  });
  const coupledResult = coupledStockAfterPhysicalEdit({
    previousStock: defaultVariant?.stockQuantity ?? 0,
    previousAvailable: defaultVariant?.availableQuantity ?? 0,
    nextStock: d.stockQuantity,
  });
  if (!coupledResult.ok) {
    return { fieldErrors: { stockQuantity: coupledResult.error } };
  }
  const coupledStock = coupledResult.quantities;

  const variantMirror = {
    taxRatePercent: d.taxRatePercent,
    priceGrossCents: mainGross,
    priceNetCents: mainNet,
    listPriceGrossCents: listGross,
    listPriceNetCents: listNet,
    lowestPrice30dGrossCents: lowGross,
    lowestPrice30dNetCents: lowNet,
    stockQuantity: coupledStock.stockQuantity,
    availableQuantity: coupledStock.availableQuantity,
    deliveryTimeKey: d.deliveryTimeKey,
    restockDays: d.restockDays,
    minOrderQty: d.minOrderQty,
    purchaseStep: d.purchaseStep,
    maxOrderQty: d.maxOrderQty,
    isActive: d.isActive,
  };

  try {
    await getPrisma().$transaction(async (tx) => {
      await tx.product.update({
        where: { id: d.id },
        data: {
          title: d.title,
          slug: d.slug,
          previousSlug: previousSlugForUpdate,
          subtitle: d.subtitle,
          description,
          manufacturerId: d.manufacturerId,
          productNumber: d.productNumber,
          isActive: d.isActive,
          showWorkshopCalendar: d.showWorkshopCalendar,
          pickupAvailable: pickupFields.pickupAvailable,
          pickupStoreId: pickupFields.pickupStoreId,
          pickupReadyHours: pickupFields.pickupReadyHours,
          leadText: d.leadText,
          variantOptionName: d.variantOptionName,
          dimensionsText: legacySpecs.dimensionsText,
          weightText: legacySpecs.weightText,
          materialText: legacySpecs.materialText,
          featureBullets: reconciled.featureBullets,
          attributes: reconciled.attributes,
          ...amazon,
        },
      });
      await syncDefaultVariantFromProduct(tx, {
        id: d.id,
        productNumber: d.productNumber,
        sku: d.sku,
        ...variantMirror,
      });
      await syncProductShopMemberships(tx, d.id, {
        categoryIds,
        extraCollectionIds,
      });
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      const msg = String((e as { meta?: { target?: string[] } }).meta?.target ?? []);
      if (msg.includes("sku") || /sku/i.test(String(e))) {
        return { fieldErrors: { sku: "Diese SKU ist bereits vergeben." } };
      }
      return { error: "Dieser Slug oder diese SKU ist bereits vergeben." };
    }
    throw e;
  }

  revalidatePath("/");
  updateStorefrontCatalogCacheTag();
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${d.slug}`);
  if (slugChanged) {
    revalidatePath(`/produkte/${existing.slug}`);
  }
  revalidatePath(`/admin/products/${d.id}/edit`);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/collections");
  revalidatePath("/kategorien");
  revalidatePath("/kollektionen");
  return { ok: true };
}

export async function addProductImage(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const schema = z.object({ productId: nonEmptyString }).merge(productImageSchema);

  const raw = {
    productId: formData.get("productId"),
    url: formData.get("url"),
    alt: formData.get("alt"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const product = await getPrisma().product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, slug: true },
  });
  if (!product) {
    return { error: "Produkt nicht gefunden." };
  }

  const maxSort = await getPrisma().productImage.aggregate({
    where: { productId: product.id },
    _max: { sortOrder: true },
  });
  const nextOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const count = await getPrisma().productImage.count({ where: { productId: product.id } });
  const isFirst = count === 0;

  await getPrisma().productImage.create({
    data: {
      productId: product.id,
      url: parsed.data.url,
      alt: parsed.data.alt,
      sortOrder: nextOrder,
      isCover: isFirst,
    },
  });

  revalidatePath("/");
  updateStorefrontCatalogCacheTag();
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${product.slug}`);
  revalidatePath(`/admin/products/${product.id}/edit`);
  return { ok: true };
}

async function tryUnlinkLocalProductUpload(url: string): Promise<void> {
  if (!url.startsWith("/media/product-uploads/")) return;
  const rel = url.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", rel);
  if (!existsSync(abs)) return;
  try {
    await unlink(abs);
  } catch {
    /* Datei schon weg / ephemeral FS — DB-Löschung bleibt maßgeblich */
  }
}

async function deleteProductImageById(imageId: string): Promise<ProductFormState> {
  const image = await getPrisma().productImage.findUnique({
    where: { id: imageId },
    include: { product: { select: { slug: true, id: true } } },
  });
  if (!image) {
    return { error: "Bild nicht gefunden." };
  }

  try {
    await tryUnlinkLocalProductUpload(image.url);
    if (isManagedBlobUrl(image.url)) {
      await getObjectStorage().deleteByUrl(image.url);
    }

    await getPrisma().$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });
      if (image.isCover) {
        const next = await tx.productImage.findFirst({
          where: { productId: image.productId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        if (next) {
          await tx.productImage.update({
            where: { id: next.id },
            data: { isCover: true },
          });
        }
      }
    });
  } catch (e) {
    log.error("product_image_delete_failed", { imageId, ...errorMeta(e) });
    return { error: "Bild konnte nicht gelöscht werden. Bitte erneut versuchen." };
  }

  revalidatePath("/");
  updateStorefrontCatalogCacheTag();
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${image.product.slug}`);
  revalidatePath(`/admin/products/${image.product.id}/edit`);
  return { ok: true, revision: Date.now(), mediaIntent: "delete" };
}

async function setProductCoverImageById(imageId: string): Promise<ProductFormState> {
  const image = await getPrisma().productImage.findUnique({
    where: { id: imageId },
    include: { product: { select: { slug: true, id: true } } },
  });
  if (!image) {
    return { error: "Bild nicht gefunden." };
  }

  await getPrisma().$transaction([
    getPrisma().productImage.updateMany({
      where: { productId: image.productId },
      data: { isCover: false },
    }),
    getPrisma().productImage.update({
      where: { id: imageId },
      data: { isCover: true },
    }),
  ]);

  revalidatePath("/");
  updateStorefrontCatalogCacheTag();
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${image.product.slug}`);
  revalidatePath(`/admin/products/${image.product.id}/edit`);
  return { ok: true, revision: Date.now(), mediaIntent: "cover" };
}

/** Form-Action: intent = `delete` | `cover`, Feld `imageId`. */
export async function productImageMediaAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const intent = String(formData.get("intent") ?? "");
  const imageId = String(formData.get("imageId") ?? "").trim();
  if (!imageId) {
    return { error: "Bild nicht gefunden." };
  }

  if (intent === "delete") {
    return deleteProductImageById(imageId);
  }
  if (intent === "cover") {
    return setProductCoverImageById(imageId);
  }
  return { error: "Unbekannte Aktion." };
}

/** Direkt aufrufbar aus Client-Transitions (zuverlässiger als mehrfach geteilte Form-Actions). */
export async function deleteProductImage(imageId: string): Promise<ProductFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }
  const id = imageId.trim();
  if (!id) return { error: "Bild nicht gefunden." };
  return deleteProductImageById(id);
}

export async function setProductCoverImage(imageId: string): Promise<ProductFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }
  const id = imageId.trim();
  if (!id) return { error: "Bild nicht gefunden." };
  return setProductCoverImageById(id);
}

export async function uploadProductImages(
  productId: string,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const product = await getPrisma().product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, title: true },
  });
  if (!product) {
    return { error: "Produkt nicht gefunden." };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Keine Dateien ausgewählt." };
  }

  const maxSort = await getPrisma().productImage.aggregate({
    where: { productId },
    _max: { sortOrder: true },
  });
  let nextOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const countBefore = await getPrisma().productImage.count({ where: { productId } });
  let isFirst = countBefore === 0;

  try {
    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return { error: `Datei zu groß (max. ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` };
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return { error: "Nur JPEG-, PNG- oder WebP-Bilder erlaubt." };
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const stored = await persistProductImageUpload({
        productId,
        bytes: buf,
        contentType: file.type,
      });
      if (!stored.ok) {
        return { error: stored.error };
      }

      const altBase = product.title.slice(0, 80);
      await getPrisma().productImage.create({
        data: {
          productId,
          url: stored.url,
          alt: `${altBase} – Produktbild`,
          sortOrder: nextOrder,
          isCover: isFirst,
        },
      });
      nextOrder += 1;
      isFirst = false;
    }
  } catch (e) {
    log.error("product_image_upload_failed", { productId, ...errorMeta(e) });
    return { error: "Upload fehlgeschlagen." };
  }

  revalidatePath("/");
  updateStorefrontCatalogCacheTag();
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${product.slug}`);
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true };
}
