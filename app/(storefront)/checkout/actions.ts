"use server";

import { revalidatePath } from "next/cache";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartWithLines } from "@/lib/cart/cart-queries";
import { checkoutFormSchema } from "@/lib/checkout/schemas";
import { generateOrderNumber } from "@/lib/checkout/order-number";
import { vatCentsFromGross } from "@/lib/catalog/pricing";
import { getPrisma } from "@/lib/db/prisma";
import { z } from "zod";

export type CheckoutActionState =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

export async function submitCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const raw = {
    email: formData.get("email"),
    shippingFirstName: formData.get("shippingFirstName"),
    shippingLastName: formData.get("shippingLastName"),
    shippingCompany: formData.get("shippingCompany"),
    shippingLine1: formData.get("shippingLine1"),
    shippingLine2: formData.get("shippingLine2"),
    shippingZip: formData.get("shippingZip"),
    shippingCity: formData.get("shippingCity"),
    shippingCountry: formData.get("shippingCountry") ?? "DE",
    phone: formData.get("phone"),
    paymentMethod: formData.get("paymentMethod"),
    idempotencyKey: formData.get("idempotencyKey"),
  };

  const parsed = checkoutFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;

  const existing = await getPrisma().order.findUnique({
    where: { idempotencyKey: d.idempotencyKey },
    select: { orderNumber: true },
  });
  if (existing) {
    return { ok: true, orderNumber: existing.orderNumber };
  }

  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return { ok: false, error: "Warenkorb nicht gefunden." };
  }

  const cart = await getCartWithLines(cartId);
  if (!cart?.lines.length) {
    return { ok: false, error: "Warenkorb ist leer." };
  }

  const activeLines = cart.lines.filter((l) => l.product.isActive);
  if (!activeLines.length) {
    return { ok: false, error: "Keine bestellbaren Artikel im Warenkorb." };
  }

  for (const line of activeLines) {
    const p = line.product;
    if (line.quantity > p.stockQuantity) {
      return { ok: false, error: `Nicht genug Lager für „${p.title}“. Bitte Menge anpassen.` };
    }
  }

  let subtotal = 0;
  let taxTotal = 0;
  for (const line of activeLines) {
    const gross = line.quantity * line.product.priceGrossCents;
    subtotal += gross;
    taxTotal += vatCentsFromGross(gross, line.product.taxRatePercent);
  }

  const shippingCents = 0;
  const totalGross = subtotal + shippingCents;

  const orderNumber = generateOrderNumber();

  try {
    await getPrisma().$transaction(async (tx) => {
      await tx.order.create({
        data: {
          orderNumber,
          email: d.email,
          phone: d.phone,
          paymentMethod: d.paymentMethod,
          status: "bestaetigt",
          shippingFirstName: d.shippingFirstName,
          shippingLastName: d.shippingLastName,
          shippingCompany: d.shippingCompany,
          shippingLine1: d.shippingLine1,
          shippingLine2: d.shippingLine2,
          shippingZip: d.shippingZip,
          shippingCity: d.shippingCity,
          shippingCountry: d.shippingCountry,
          customerNote: cart.customerNote,
          subtotalGrossCents: subtotal,
          shippingCents,
          taxAmountCents: taxTotal,
          totalGrossCents: totalGross,
          idempotencyKey: d.idempotencyKey,
          items: {
            create: activeLines.map((line) => ({
              productId: line.product.id,
              productTitleSnapshot: line.product.title,
              unitPriceGrossCents: line.product.priceGrossCents,
              taxRatePercentSnapshot: line.product.taxRatePercent,
              quantity: line.quantity,
              lineTotalGrossCents: line.quantity * line.product.priceGrossCents,
            })),
          },
        },
      });

      for (const line of activeLines) {
        await tx.product.update({
          where: { id: line.product.id },
          data: { stockQuantity: { decrement: line.quantity } },
        });
      }

      await tx.cartLine.deleteMany({ where: { cartId } });
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Bestellung konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  revalidatePath("/produkte");

  return { ok: true, orderNumber };
}
