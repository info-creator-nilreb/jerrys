"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { parseEuroInputToCents } from "@/lib/catalog/format";
import { netCentsFromGross } from "@/lib/catalog/pricing";
import { getPrisma } from "@/lib/db/prisma";
import { nonEmptyString } from "@/lib/validation/form";

export type VariantActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | null;

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

function revalidateProductVariantPaths(product: { id: string; slug: string }) {
  revalidatePath("/");
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${product.slug}`);
  revalidatePath(`/admin/products/${product.id}/edit`);
}

const addVariantSchema = z.object({
  productId: nonEmptyString,
  sku: z.string().trim().min(1, "SKU ist Pflicht.").max(64),
  title: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : s.slice(0, 120)))
    .nullable()
    .optional(),
  priceGrossEuro: nonEmptyString,
  availableQuantity: z.coerce.number().int().min(0),
  stockQuantity: z.coerce.number().int().min(0),
});

export async function createProductVariant(
  _prev: VariantActionState,
  formData: FormData,
): Promise<VariantActionState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const parsed = addVariantSchema.safeParse({
    productId: formData.get("productId"),
    sku: formData.get("sku"),
    title: formData.get("title") ?? "",
    priceGrossEuro: formData.get("priceGrossEuro"),
    availableQuantity: formData.get("availableQuantity"),
    stockQuantity: formData.get("stockQuantity"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const gross = parseEuroInputToCents(d.priceGrossEuro);
  if (gross === null || gross < 0) {
    return { fieldErrors: { priceGrossEuro: "Ungültiger Preis." } };
  }

  const product = await getPrisma().product.findUnique({
    where: { id: d.productId },
    select: {
      id: true,
      slug: true,
      productNumber: true,
      variants: {
        where: { isDefault: true },
        take: 1,
        select: {
          taxRatePercent: true,
          minOrderQty: true,
          purchaseStep: true,
          maxOrderQty: true,
          deliveryTimeKey: true,
          restockDays: true,
        },
      },
    },
  });
  if (!product) {
    return { error: "Produkt nicht gefunden." };
  }
  const template = product.variants[0];
  if (!template) {
    return { error: "Standard-Variante fehlt — bitte Produkt zuerst speichern." };
  }

  const net = netCentsFromGross(gross, template.taxRatePercent);
  const maxSort = await getPrisma().productVariant.aggregate({
    where: { productId: product.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  try {
    await getPrisma().productVariant.create({
      data: {
        productId: product.id,
        sku: d.sku.trim(),
        title: d.title ?? null,
        priceGrossCents: gross,
        priceNetCents: net,
        taxRatePercent: template.taxRatePercent,
        stockQuantity: d.stockQuantity,
        availableQuantity: d.availableQuantity,
        deliveryTimeKey: template.deliveryTimeKey,
        restockDays: template.restockDays,
        minOrderQty: template.minOrderQty,
        purchaseStep: template.purchaseStep,
        maxOrderQty: template.maxOrderQty,
        isDefault: false,
        isActive: true,
        sortOrder,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { fieldErrors: { sku: "Diese SKU ist bereits vergeben." } };
    }
    throw e;
  }

  revalidateProductVariantPaths(product);
  return { ok: true };
}

const updateVariantSchema = z.object({
  variantId: nonEmptyString,
  sku: z.string().trim().min(1, "SKU ist Pflicht.").max(64),
  title: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : s.slice(0, 120)))
    .nullable()
    .optional(),
  priceGrossEuro: nonEmptyString,
  availableQuantity: z.coerce.number().int().min(0),
  stockQuantity: z.coerce.number().int().min(0),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("1")])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

export async function updateProductVariant(
  _prev: VariantActionState,
  formData: FormData,
): Promise<VariantActionState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { error: "Nicht angemeldet." };
  }

  const parsed = updateVariantSchema.safeParse({
    variantId: formData.get("variantId"),
    sku: formData.get("sku"),
    title: formData.get("title") ?? "",
    priceGrossEuro: formData.get("priceGrossEuro"),
    availableQuantity: formData.get("availableQuantity"),
    stockQuantity: formData.get("stockQuantity"),
    isActive: formData.get("isActive") ?? undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const gross = parseEuroInputToCents(d.priceGrossEuro);
  if (gross === null || gross < 0) {
    return { fieldErrors: { priceGrossEuro: "Ungültiger Preis." } };
  }

  const variant = await getPrisma().productVariant.findUnique({
    where: { id: d.variantId },
    select: {
      id: true,
      isDefault: true,
      taxRatePercent: true,
      product: { select: { id: true, slug: true } },
    },
  });
  if (!variant) {
    return { error: "Variante nicht gefunden." };
  }
  if (variant.isDefault) {
    return { error: "Die Standard-Variante wird über das Hauptformular gepflegt." };
  }

  const net = netCentsFromGross(gross, variant.taxRatePercent);

  try {
    await getPrisma().productVariant.update({
      where: { id: variant.id },
      data: {
        sku: d.sku.trim(),
        title: d.title ?? null,
        priceGrossCents: gross,
        priceNetCents: net,
        stockQuantity: d.stockQuantity,
        availableQuantity: d.availableQuantity,
        isActive: d.isActive ?? false,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { fieldErrors: { sku: "Diese SKU ist bereits vergeben." } };
    }
    throw e;
  }

  revalidateProductVariantPaths(variant.product);
  return { ok: true };
}
