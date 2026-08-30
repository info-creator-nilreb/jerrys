"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import {
  clampToValidQuantity,
  isValidCartQuantity,
  nextQuantityStep,
  previousQuantityStep,
} from "@/lib/cart/quantity";
import { addToCartFromFormData } from "@/lib/cart/add-to-cart-from-form-data";
import { cartLineCommerceRules, cartVariantSelect, getCartWithLines } from "@/lib/cart/cart-queries";
import { getPrisma } from "@/lib/db/prisma";
import { nonEmptyString } from "@/lib/validation/form";

export type CartActionState = {
  error?: string;
  ok?: boolean;
  addedQuantity?: number;
  badgeCount?: number;
} | null;

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
  return addToCartFromFormData(formData);
}

export async function addToCartAndRedirectToExpressCart(formData: FormData) {
  await addToCart(null, formData);
  const provider = String(formData.get("expressProvider") ?? "paypal").trim();
  const qs = provider === "applepay" ? "?express=applepay" : "?express=paypal";
  redirect(`/warenkorb${qs}`);
}

async function loadCartLineForMutation(lineId: string, cartId: string) {
  return getPrisma().cartLine.findFirst({
    where: { id: lineId, cartId },
    include: {
      product: { select: { isActive: true } },
      productVariant: { select: cartVariantSelect },
    },
  });
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

  const line = await loadCartLineForMutation(parsed.data.lineId, cartId);
  if (!line || !line.product.isActive) {
    return { error: "Position nicht gefunden." };
  }

  const rules = cartLineCommerceRules(line);
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

export async function incrementCartLineQuantity(formData: FormData) {
  const parsed = lineSchema.safeParse({ lineId: formData.get("lineId") });
  if (!parsed.success) return;

  const cartId = await getCartIdFromCookie();
  if (!cartId) return;

  const line = await loadCartLineForMutation(parsed.data.lineId, cartId);
  if (!line?.product.isActive) return;

  const rules = cartLineCommerceRules(line);
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
    const commerce = cartLineCommerceRules(l);
    const gross = l.quantity * commerce.priceGrossCents;
    subtotal += gross;
    const img = l.product.images[0];
    return {
      lineId: l.id,
      productSlug: l.product.slug,
      title: l.product.title,
      quantity: l.quantity,
      imageUrl: img?.url ?? null,
      imageAlt: img?.alt ?? null,
      unitPriceGrossCents: commerce.priceGrossCents,
      lineTotalGrossCents: gross,
      currency,
    };
  });

  return { lines, subtotalGrossCents: subtotal, currency };
}

export async function decrementCartLineQuantity(formData: FormData) {
  const parsed = lineSchema.safeParse({ lineId: formData.get("lineId") });
  if (!parsed.success) return;

  const cartId = await getCartIdFromCookie();
  if (!cartId) return;

  const line = await loadCartLineForMutation(parsed.data.lineId, cartId);
  if (!line?.product.isActive) return;

  const rules = cartLineCommerceRules(line);
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
