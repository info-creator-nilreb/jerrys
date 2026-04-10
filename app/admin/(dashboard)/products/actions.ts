"use server";

import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { parseEuroInputToCents } from "@/lib/catalog/format";
import {
  createProductFormSchema,
  productCoreSchema,
  productImageSchema,
} from "@/lib/catalog/schemas";
import { sanitizeProductDescriptionHtml } from "@/lib/catalog/sanitize-html";
import { getPrisma } from "@/lib/db/prisma";
import { nonEmptyString } from "@/lib/validation/form";

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

async function requireAdminSession(): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | null;

const updateProductFormSchema = productCoreSchema.and(
  z.object({
    id: nonEmptyString,
  }),
);

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function extFromMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await auth();
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
    freeShipping: formData.get("freeShipping") === "on",
    minOrderQty: formData.get("minOrderQty"),
    purchaseStep: formData.get("purchaseStep"),
    maxOrderQty: formData.get("maxOrderQty"),
    imageUrl: formData.get("imageUrl"),
    imageAlt: formData.get("imageAlt"),
    isActive: parseIsActiveFromFormData(formData),
  };

  const parsed = createProductFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const mainGross = parseEuroInputToCents(d.priceGrossEuro)!;
  const mainNet = parseEuroInputToCents(d.priceNetEuro)!;
  const listGross = d.listPriceGrossEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceGrossEuro);
  const listNet = d.listPriceNetEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceNetEuro);
  const lowGross = d.lowest30GrossEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30GrossEuro);
  const lowNet = d.lowest30NetEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30NetEuro);
  const description = sanitizeProductDescriptionHtml(d.descriptionHtml);

  try {
    await getPrisma().product.create({
      data: {
        title: d.title,
        slug: d.slug,
        subtitle: d.subtitle,
        description,
        manufacturerId: d.manufacturerId,
        productNumber: d.productNumber,
        taxRatePercent: d.taxRatePercent,
        priceGrossCents: mainGross,
        priceNetCents: mainNet,
        listPriceGrossCents: listGross,
        listPriceNetCents: listNet,
        lowestPrice30dGrossCents: lowGross,
        lowestPrice30dNetCents: lowNet,
        stockQuantity: d.stockQuantity,
        deliveryTimeKey: d.deliveryTimeKey,
        restockDays: d.restockDays,
        freeShipping: d.freeShipping,
        minOrderQty: d.minOrderQty,
        purchaseStep: d.purchaseStep,
        maxOrderQty: d.maxOrderQty,
        isActive: d.isActive,
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
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { error: "Dieser Slug ist bereits vergeben." };
    }
    throw e;
  }

  revalidatePath("/");
  revalidatePath("/produkte");
  redirect("/admin/products");
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await auth();
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
    freeShipping: formData.get("freeShipping") === "on",
    minOrderQty: formData.get("minOrderQty"),
    purchaseStep: formData.get("purchaseStep"),
    maxOrderQty: formData.get("maxOrderQty"),
    isActive: parseIsActiveFromFormData(formData),
  };

  const parsed = updateProductFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const mainGross = parseEuroInputToCents(d.priceGrossEuro)!;
  const mainNet = parseEuroInputToCents(d.priceNetEuro)!;
  const listGross = d.listPriceGrossEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceGrossEuro);
  const listNet = d.listPriceNetEuro.trim() === "" ? null : parseEuroInputToCents(d.listPriceNetEuro);
  const lowGross = d.lowest30GrossEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30GrossEuro);
  const lowNet = d.lowest30NetEuro.trim() === "" ? null : parseEuroInputToCents(d.lowest30NetEuro);
  const description = sanitizeProductDescriptionHtml(d.descriptionHtml);

  const existing = await getPrisma().product.findUnique({
    where: { id: d.id },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return { error: "Produkt nicht gefunden." };
  }

  const previousSlug = existing.slug;

  try {
    await getPrisma().product.update({
      where: { id: d.id },
      data: {
        title: d.title,
        slug: d.slug,
        subtitle: d.subtitle,
        description,
        manufacturerId: d.manufacturerId,
        productNumber: d.productNumber,
        taxRatePercent: d.taxRatePercent,
        priceGrossCents: mainGross,
        priceNetCents: mainNet,
        listPriceGrossCents: listGross,
        listPriceNetCents: listNet,
        lowestPrice30dGrossCents: lowGross,
        lowestPrice30dNetCents: lowNet,
        stockQuantity: d.stockQuantity,
        deliveryTimeKey: d.deliveryTimeKey,
        restockDays: d.restockDays,
        freeShipping: d.freeShipping,
        minOrderQty: d.minOrderQty,
        purchaseStep: d.purchaseStep,
        maxOrderQty: d.maxOrderQty,
        isActive: d.isActive,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { error: "Dieser Slug ist bereits vergeben." };
    }
    throw e;
  }

  revalidatePath("/");
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${d.slug}`);
  if (previousSlug !== d.slug) {
    revalidatePath(`/produkte/${previousSlug}`);
  }
  revalidatePath(`/admin/products/${d.id}/edit`);
  return { ok: true };
}

export async function addProductImage(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await auth();
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
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${product.slug}`);
  revalidatePath(`/admin/products/${product.id}/edit`);
  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<{ error?: string }> {
  await requireAdminSession();

  const image = await getPrisma().productImage.findUnique({
    where: { id: imageId },
    include: { product: { select: { slug: true, id: true } } },
  });
  if (!image) {
    return { error: "Bild nicht gefunden." };
  }

  if (image.url.startsWith("/media/product-uploads/")) {
    const rel = image.url.replace(/^\//, "");
    const abs = path.join(process.cwd(), "public", rel);
    if (existsSync(abs)) {
      try {
        await unlink(abs);
      } catch {
        /* ignore */
      }
    }
  }

  await getPrisma().productImage.delete({ where: { id: imageId } });

  if (image.isCover) {
    const next = await getPrisma().productImage.findFirst({
      where: { productId: image.productId },
      orderBy: { sortOrder: "asc" },
    });
    if (next) {
      await getPrisma().productImage.update({
        where: { id: next.id },
        data: { isCover: true },
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${image.product.slug}`);
  revalidatePath(`/admin/products/${image.productId}/edit`);
  return {};
}

export async function setProductCoverImage(imageId: string): Promise<{ error?: string }> {
  await requireAdminSession();

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
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${image.product.slug}`);
  revalidatePath(`/admin/products/${image.productId}/edit`);
  return {};
}

export async function uploadProductImages(
  productId: string,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await auth();
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

  const dir = path.join(process.cwd(), "public", "media", "product-uploads", productId);
  await mkdir(dir, { recursive: true });

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
      const ext = extFromMime(file.type);
      if (!ext) {
        return { error: "Ungültiger Bildtyp." };
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const filename = `${randomUUID()}.${ext}`;
      const fullPath = path.join(dir, filename);
      await writeFile(fullPath, buf);

      const publicUrl = `/media/product-uploads/${productId}/${filename}`;
      const altBase = product.title.slice(0, 80);
      await getPrisma().productImage.create({
        data: {
          productId,
          url: publicUrl,
          alt: `${altBase} – Produktbild`,
          sortOrder: nextOrder,
          isCover: isFirst,
        },
      });
      nextOrder += 1;
      isFirst = false;
    }
  } catch (e) {
    console.error(e);
    return { error: "Upload fehlgeschlagen." };
  }

  revalidatePath("/");
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${product.slug}`);
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true };
}
