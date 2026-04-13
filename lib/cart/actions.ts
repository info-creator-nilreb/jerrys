"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCartIdFromCookie, ensureCartIdAndCookie } from "@/lib/cart/cart-cookie";
import {
  clampToValidQuantity,
  defaultAddQuantity,
  isValidCartQuantity,
  nextQuantityStep,
  previousQuantityStep,
} from "@/lib/cart/quantity";
import { getCartWithLines } from "@/lib/cart/cart-queries";
import { getPrisma } from "@/lib/db/prisma";
import { nonEmptyString } from "@/lib/validation/form";

export type CartActionState = { error?: string; ok?: boolean } | null;

const addSchema = z.object({
  productId: nonEmptyString,
});

const lineSchema = z.object({
  lineId: nonEmptyString,
});

const updateQtySchema = lineSchema.extend({
  quantity: z.coerce.number().int().min(1),
});

export async function addToCart(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = addSchema.safeParse({ productId: formData.get("productId") });
  if (!parsed.success) {
    return { error: "Ungültiges Produkt." };
  }

  const product = await getPrisma().product.findFirst({
    where: { id: parsed.data.productId, isActive: true },
  });
  if (!product) {
    return { error: "Produkt nicht verfügbar." };
  }

  const rules = {
    availableQuantity: product.availableQuantity,
    minOrderQty: product.minOrderQty,
    purchaseStep: product.purchaseStep,
    maxOrderQty: product.maxOrderQty,
  };

  const cartId = await ensureCartIdAndCookie();

  const existing = await getPrisma().cartLine.findUnique({
    where: {
      cartId_productId: { cartId, productId: product.id },
    },
  });

  const rawQtyField = formData.get("quantity");
  const rawQtyTrimmed = rawQtyField !== null ? String(rawQtyField).trim() : "";
  const hasExplicitQuantity = rawQtyTrimmed !== "";

  let nextQty: number | null;
  if (hasExplicitQuantity) {
    const n = Number(rawQtyTrimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { error: "Bitte eine gültige Menge eingeben." };
    }
    nextQty = clampToValidQuantity(rules, n);
    if (nextQty === null || !isValidCartQuantity(rules, nextQty)) {
      return { error: "Diese Menge ist nicht möglich (Mindestabnahme, Staffelung, Lager)." };
    }
  } else if (existing) {
    nextQty = nextQuantityStep(rules, existing.quantity);
  } else {
    nextQty = defaultAddQuantity(rules);
  }

  if (nextQty === null) {
    return { error: "Diese Menge ist nicht möglich (Lager oder Staffelung)." };
  }

  if (existing) {
    await getPrisma().cartLine.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await getPrisma().cartLine.create({
      data: { cartId, productId: product.id, quantity: nextQty },
    });
  }

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/produkte");
  revalidatePath(`/produkte/${product.slug}`);
  revalidatePath("/");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCartLineQuantity(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = updateQtySchema.safeParse({
    lineId: formData.get("lineId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: "Ungültige Eingabe." };
  }

  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return { error: "Warenkorb nicht gefunden." };
  }

  const line = await getPrisma().cartLine.findFirst({
    where: { id: parsed.data.lineId, cartId },
    include: { product: true },
  });
  if (!line || !line.product.isActive) {
    return { error: "Position nicht gefunden." };
  }

  const p = line.product;
  const rules = {
    availableQuantity: p.availableQuantity,
    minOrderQty: p.minOrderQty,
    purchaseStep: p.purchaseStep,
    maxOrderQty: p.maxOrderQty,
  };

  const q = clampToValidQuantity(rules, parsed.data.quantity);
  if (q === null || !isValidCartQuantity(rules, q)) {
    return { error: "Menge nicht zulässig (Mindestabnahme, Staffelung, Lager)." };
  }

  await getPrisma().cartLine.update({
    where: { id: line.id },
    data: { quantity: q },
  });

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCartLine(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = lineSchema.safeParse({ lineId: formData.get("lineId") });
  if (!parsed.success) {
    return { error: "Ungültige Position." };
  }

  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return { error: "Warenkorb nicht gefunden." };
  }

  const res = await getPrisma().cartLine.deleteMany({
    where: { id: parsed.data.lineId, cartId },
  });
  if (res.count === 0) {
    return { error: "Position nicht gefunden." };
  }

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Für `<form action={…}>` ohne `useActionState` (eine FormData-Argument-Signatur). */
export async function submitRemoveCartLine(formData: FormData) {
  await removeCartLine(null, formData);
}

export async function submitUpdateCartLineQuantity(formData: FormData) {
  await updateCartLineQuantity(null, formData);
}

export async function updateCartCustomerNote(formData: FormData) {
  const cartId = await getCartIdFromCookie();
  if (!cartId) return;

  const raw = String(formData.get("note") ?? "");
  const note = raw.trim() === "" ? null : raw.trim().slice(0, 5000);

  await getPrisma().cart.update({
    where: { id: cartId },
    data: { customerNote: note },
  });

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
}

export async function incrementCartLineQuantity(formData: FormData) {
  const parsed = lineSchema.safeParse({ lineId: formData.get("lineId") });
  if (!parsed.success) return;

  const cartId = await getCartIdFromCookie();
  if (!cartId) return;

  const line = await getPrisma().cartLine.findFirst({
    where: { id: parsed.data.lineId, cartId },
    include: { product: true },
  });
  if (!line?.product.isActive) return;

  const p = line.product;
  const rules = {
    availableQuantity: p.availableQuantity,
    minOrderQty: p.minOrderQty,
    purchaseStep: p.purchaseStep,
    maxOrderQty: p.maxOrderQty,
  };

  const next = nextQuantityStep(rules, line.quantity);
  if (next === null) return;

  await getPrisma().cartLine.update({
    where: { id: line.id },
    data: { quantity: next },
  });

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

export type CartFlyoutPreview = {
  lines: Array<{
    lineId: string;
    productSlug: string;
    title: string;
    quantity: number;
    imageUrl: string | null;
    imageAlt: string | null;
    unitPriceGrossCents: number;
    lineTotalGrossCents: number;
    currency: string;
  }>;
  subtotalGrossCents: number;
  currency: string;
};

/** Für den Header-Warenkorb (Flyout); liest den aktuellen Cookie-Warenkorb. */
export async function getCartFlyoutPreview(): Promise<CartFlyoutPreview> {
  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return { lines: [], subtotalGrossCents: 0, currency: "EUR" };
  }
  const cart = await getCartWithLines(cartId);
  if (!cart?.lines.length) {
    return { lines: [], subtotalGrossCents: 0, currency: "EUR" };
  }

  const active = cart.lines.filter((l) => l.product.isActive);
  let subtotal = 0;
  const currency = active[0]?.product.currency ?? "EUR";

  const lines = active.map((l) => {
    const gross = l.quantity * l.product.priceGrossCents;
    subtotal += gross;
    const img = l.product.images[0];
    return {
      lineId: l.id,
      productSlug: l.product.slug,
      title: l.product.title,
      quantity: l.quantity,
      imageUrl: img?.url ?? null,
      imageAlt: img?.alt ?? null,
      unitPriceGrossCents: l.product.priceGrossCents,
      lineTotalGrossCents: gross,
      currency: l.product.currency,
    };
  });

  return { lines, subtotalGrossCents: subtotal, currency };
}

export async function decrementCartLineQuantity(formData: FormData) {
  const parsed = lineSchema.safeParse({ lineId: formData.get("lineId") });
  if (!parsed.success) return;

  const cartId = await getCartIdFromCookie();
  if (!cartId) return;

  const line = await getPrisma().cartLine.findFirst({
    where: { id: parsed.data.lineId, cartId },
    include: { product: true },
  });
  if (!line?.product.isActive) return;

  const p = line.product;
  const rules = {
    availableQuantity: p.availableQuantity,
    minOrderQty: p.minOrderQty,
    purchaseStep: p.purchaseStep,
    maxOrderQty: p.maxOrderQty,
  };

  const prev = previousQuantityStep(rules, line.quantity);
  if (prev === "remove") {
    await getPrisma().cartLine.delete({ where: { id: line.id } });
  } else {
    await getPrisma().cartLine.update({
      where: { id: line.id },
      data: { quantity: prev },
    });
  }

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}
