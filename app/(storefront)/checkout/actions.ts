"use server";

import { revalidatePath } from "next/cache";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartWithLines } from "@/lib/cart/cart-queries";
import { checkoutFormSchema } from "@/lib/checkout/schemas";
import { generateOrderNumber } from "@/lib/checkout/order-number";
import { vatCentsFromGross } from "@/lib/catalog/pricing";
import { sendOrderConfirmationIfNeeded } from "@/lib/email/order-confirmation";
import { ORDER_EVENT_PLACED } from "@/lib/orders/order-events";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { createStripeCheckoutSession } from "@/lib/payments/stripe-checkout-session";
import { getStripe } from "@/lib/payments/stripe-client";
import { usesStripeHostedCheckout } from "@/lib/payments/online-payment-method";
import { z } from "zod";

const log = createLogger("checkout");

export type CheckoutActionState =
  | { ok: true; orderNumber: string; stripeCheckoutUrl?: string }
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
    billingUseShipping: formData.get("billingUseShipping"),
    billingFirstName: formData.get("billingFirstName"),
    billingLastName: formData.get("billingLastName"),
    billingCompany: formData.get("billingCompany"),
    billingLine1: formData.get("billingLine1"),
    billingLine2: formData.get("billingLine2"),
    billingZip: formData.get("billingZip"),
    billingCity: formData.get("billingCity"),
    billingCountry: formData.get("billingCountry"),
    phone: formData.get("phone"),
    paymentMethod: formData.get("paymentMethod"),
    idempotencyKey: formData.get("idempotencyKey"),
  };

  const parsed = checkoutFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const useStripeCheckout = usesStripeHostedCheckout(d.paymentMethod) && getStripe() !== null;

  const existing = await getPrisma().order.findUnique({
    where: { idempotencyKey: d.idempotencyKey },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      email: true,
      totalGrossCents: true,
      currency: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          productTitleSnapshot: true,
          quantity: true,
          unitPriceGrossCents: true,
        },
      },
    },
  });

  if (existing) {
    if (existing.status === "pending_payment" && useStripeCheckout) {
      const stripe = getStripe();
      if (!stripe) {
        return { ok: true, orderNumber: existing.orderNumber };
      }
      try {
        const session = await createStripeCheckoutSession(stripe, {
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          email: existing.email,
          currency: existing.currency,
          lines: existing.items.map((i) => ({
            title: i.productTitleSnapshot,
            quantity: i.quantity,
            unitAmountGrossCents: i.unitPriceGrossCents,
          })),
        });
        await getPrisma().orderPayment.create({
          data: {
            orderId: existing.id,
            provider: "stripe",
            providerRef: session.id,
            status: "pending",
            amountGrossCents: existing.totalGrossCents,
            currency: existing.currency,
          },
        });
        const url = session.url;
        if (!url) {
          throw new Error("Stripe-Checkout ohne redirect-URL.");
        }
        return { ok: true, orderNumber: existing.orderNumber, stripeCheckoutUrl: url };
      } catch (e) {
        log.error("stripe_checkout_resume_failed", {
          orderId: existing.id,
          ...errorMeta(e),
        });
        return { ok: false, error: "Zahlungsstart fehlgeschlagen. Bitte erneut versuchen." };
      }
    }

    log.info("submit_idempotent_hit", {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
    });
    await sendOrderConfirmationIfNeeded(existing.id);
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
  const orderCurrency = activeLines[0]!.product.currency;

  const orderNumber = generateOrderNumber();

  let newOrderId = "";

  const orderStatus = useStripeCheckout ? "pending_payment" : "bestaetigt";

  try {
    await getPrisma().$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          email: d.email,
          phone: d.phone,
          paymentMethod: d.paymentMethod,
          status: orderStatus,
          currency: orderCurrency,
          shippingFirstName: d.shippingFirstName,
          shippingLastName: d.shippingLastName,
          shippingCompany: d.shippingCompany,
          shippingLine1: d.shippingLine1,
          shippingLine2: d.shippingLine2,
          shippingZip: d.shippingZip,
          shippingCity: d.shippingCity,
          shippingCountry: d.shippingCountry,
          billingFirstName: d.billingFirstName,
          billingLastName: d.billingLastName,
          billingCompany: d.billingCompany,
          billingLine1: d.billingLine1,
          billingLine2: d.billingLine2,
          billingZip: d.billingZip,
          billingCity: d.billingCity,
          billingCountry: d.billingCountry,
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
          statusHistory: {
            create: [{ fromStatus: null, toStatus: orderStatus }],
          },
          events: {
            create: [
              {
                eventType: ORDER_EVENT_PLACED,
                metadata: { orderNumber, channel: "checkout" },
              },
            ],
          },
        },
      });
      newOrderId = created.id;

      if (!useStripeCheckout) {
        for (const line of activeLines) {
          await tx.product.update({
            where: { id: line.product.id },
            data: { stockQuantity: { decrement: line.quantity } },
          });
        }
      }

      await tx.cartLine.deleteMany({ where: { cartId } });
    });
  } catch (e) {
    log.error("order_create_failed", {
      orderNumber,
      idempotencyKey: d.idempotencyKey,
      ...errorMeta(e),
    });
    return { ok: false, error: "Bestellung konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }

  log.info("order_created", {
    orderId: newOrderId,
    orderNumber,
    lineCount: activeLines.length,
    paymentFlow: useStripeCheckout ? "stripe_hosted" : "immediate",
  });

  let stripeCheckoutUrl: string | undefined;
  if (useStripeCheckout) {
    const stripe = getStripe();
    if (!stripe) {
      log.error("stripe_missing_after_order", { orderId: newOrderId });
      return {
        ok: false,
        error:
          "Online-Zahlung ist gerade nicht verfügbar. Bitte den Support mit deiner Bestellnummer kontaktieren oder Vorkasse wählen.",
      };
    }
    try {
      const session = await createStripeCheckoutSession(stripe, {
        orderId: newOrderId,
        orderNumber,
        email: d.email,
        currency: orderCurrency,
        lines: activeLines.map((line) => ({
          title: line.product.title,
          quantity: line.quantity,
          unitAmountGrossCents: line.product.priceGrossCents,
        })),
      });
      await getPrisma().orderPayment.create({
        data: {
          orderId: newOrderId,
          provider: "stripe",
          providerRef: session.id,
          status: "pending",
          amountGrossCents: totalGross,
          currency: orderCurrency,
        },
      });
      const url = session.url;
      if (!url) {
        throw new Error("Stripe-Checkout ohne redirect-URL.");
      }
      stripeCheckoutUrl = url;
    } catch (e) {
      log.error("stripe_checkout_session_failed", {
        orderId: newOrderId,
        orderNumber,
        ...errorMeta(e),
      });
      return {
        ok: false,
        error:
          "Die Bestellung wurde angelegt, der Zahlungsstart ist fehlgeschlagen. Bitte mit derselben Bestellung erneut auf „Jetzt bestellen“ klicken oder den Support kontaktieren.",
      };
    }
  }

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  revalidatePath("/produkte");
  revalidatePath("/admin/orders");

  await sendOrderConfirmationIfNeeded(newOrderId);

  return {
    ok: true,
    orderNumber,
    ...(stripeCheckoutUrl ? { stripeCheckoutUrl } : {}),
  };
}
