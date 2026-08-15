import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  confirmWorkshopBookingAfterOrderPaid,
  getWorkshopHoldForCheckout,
} from "@/features/workshops";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/checkout/schemas";
import { checkoutRawFromFormData } from "@/lib/checkout/create-pending-paypal-order-from-form";
import { generateOrderNumber } from "@/lib/checkout/order-number";
import { netCentsFromGross } from "@/lib/catalog/pricing";
import { sendOrderConfirmationIfNeeded } from "@/lib/email/order-confirmation";
import { sendWorkshopBookingConfirmationIfNeeded } from "@/lib/email/workshop-booking-emails";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { usesPaypalHostedCheckout } from "@/lib/payments/online-payment-method";
import { parseCheckoutPayPalSurface } from "@/lib/checkout/checkout-paypal-surface";
import {
  paymentSourceForCheckoutForm,
  paypalOrderCreateUserMessage,
  startPayPalCheckoutOrderFromForm,
} from "@/lib/checkout/paypal-order-payment-source";
import { ORDER_EVENT_PLACED } from "@/lib/orders/order-events";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";
import { computeWorkshopCheckoutOrderTotals } from "@/lib/workshop/workshop-checkout-totals";
import { getWorkshopCheckoutCatalogLine } from "@/lib/workshop/workshop-checkout-catalog-query";
import { clearWorkshopBookingHoldCookie } from "@/lib/workshop/workshop-booking-cookie";
import type { CreatePendingPayPalOrderResult } from "@/lib/checkout/create-pending-paypal-order-from-form";

const log = createLogger("checkout.workshop");

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

const workshopBookingIdSchema = z.string().min(1, "Reservierung fehlt.");

export async function createWorkshopOrderFromFormData(
  formData: FormData,
): Promise<CreatePendingPayPalOrderResult> {
  const raw = checkoutRawFromFormData(formData);
  raw.workshopBookingId = formData.get("workshopBookingId");

  const parsed = checkoutFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Bitte Eingaben prüfen.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const bookingParsed = workshopBookingIdSchema.safeParse(raw.workshopBookingId);
  if (!bookingParsed.success) {
    return {
      ok: false,
      error: "Bitte Eingaben prüfen.",
      fieldErrors: { workshopBookingId: "Reservierung fehlt." },
    };
  }

  const d: CheckoutFormInput = parsed.data;
  const bookingId = bookingParsed.data;
  const surface = parseCheckoutPayPalSurface(d.checkoutPayPalSurface);

  const hold = await getWorkshopHoldForCheckout(bookingId);
  if (!hold) {
    return {
      ok: false,
      error: "Deine Platz-Reservierung ist abgelaufen oder ungültig. Bitte erneut buchen.",
    };
  }

  const usePaypalHostedCheckout = usesPaypalHostedCheckout(d.paymentMethod);
  if (usePaypalHostedCheckout && !isPayPalConfigured()) {
    return { ok: false, error: "PayPal ist derzeit nicht verfügbar." };
  }

  let customerId: string | null = null;
  try {
    const { getCustomerSession } = await import("@/lib/auth/customer-session");
    const { getVerifiedActiveCustomerId } = await import("@/features/customers");
    const session = await getCustomerSession();
    customerId = session ? await getVerifiedActiveCustomerId(session.customerId) : null;
  } catch {
    customerId = null;
  }

  const prisma = getPrisma();
  const existing = d.idempotencyKey
    ? await prisma.order.findUnique({
        where: { idempotencyKey: d.idempotencyKey },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalGrossCents: true,
          currency: true,
        },
      })
    : null;

  if (existing) {
    if (existing.status === "pending_payment" && usePaypalHostedCheckout && existing.totalGrossCents > 0) {
      if (!isPayPalConfigured()) {
        return { ok: false, error: "PayPal nicht konfiguriert." };
      }
      try {
        const started = await startPayPalCheckoutOrderFromForm({
          d,
          shopCustomerId: customerId,
          internalOrderId: existing.id,
          orderNumber: existing.orderNumber,
          totalGrossCents: existing.totalGrossCents,
          currency: existing.currency,
        });
        await prisma.orderPayment.create({
          data: {
            orderId: existing.id,
            provider: "paypal",
            providerRef: started.paypalOrderId,
            status: "pending",
            amountGrossCents: existing.totalGrossCents,
            currency: existing.currency,
          },
        });
        return {
          ok: true,
          paymentReady: true,
          orderNumber: existing.orderNumber,
          internalOrderId: existing.id,
          paypalOrderId: started.paypalOrderId,
          approvalUrl: started.approvalUrl,
          payerActionUrl: started.payerActionUrl ?? undefined,
        };
      } catch (e) {
        log.error("workshop_paypal_resume_failed", { orderId: existing.id, ...errorMeta(e) });
        return { ok: false, error: paypalOrderCreateUserMessage(e, surface) };
      }
    }

    await sendOrderConfirmationIfNeeded(existing.id);
    await sendWorkshopBookingConfirmationIfNeeded(existing.id);
    return { ok: true, paymentReady: false, orderNumber: existing.orderNumber };
  }

  const catalog = await getWorkshopCheckoutCatalogLine();
  if (!catalog) {
    return {
      ok: false,
      error:
        "Termin-Checkout ist nicht eingerichtet (interner Artikel fehlt). Bitte den Shop-Betrieb kontaktieren.",
    };
  }

  const shopShip = await getShopShippingSettings();
  if (!shopShip.shippingCountryCodes.includes(d.shippingCountry)) {
    return {
      ok: false,
      error: "Bitte Eingaben prüfen.",
      fieldErrors: {
        shippingCountry: "Lieferung in dieses Land ist derzeit nicht verfügbar.",
      },
    };
  }

  const unitGross = hold.unitPriceCents;
  const lineInputs: OrderPriceLineInput[] = [
    {
      quantity: hold.seatCount,
      priceGrossCents: unitGross,
      taxRatePercent: catalog.taxRatePercent,
    },
  ];

  const totals = computeWorkshopCheckoutOrderTotals({
    lines: lineInputs,
    shippingCountryCode: d.shippingCountry,
  });

  const orderNumber = generateOrderNumber();
  const isFree = totals.totalCents <= 0;
  const orderStatus = isFree ? "paid" : "pending_payment";

  if (!isFree) {
    const paymentSource = paymentSourceForCheckoutForm(d, customerId);
    if (!paymentSource.ok) {
      return { ok: false, error: paymentSource.error };
    }
  }

  let newOrderId = "";

  try {
    await prisma.$transaction(async (tx) => {
      const holdRow = await tx.workshopBooking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, holdExpiresAt: true, orderId: true },
      });
      if (
        !holdRow ||
        holdRow.status !== "held" ||
        !holdRow.holdExpiresAt ||
        holdRow.holdExpiresAt.getTime() <= Date.now() ||
        holdRow.orderId
      ) {
        throw new Error("hold_invalid");
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          email: d.email,
          phone: d.phone,
          customerId,
          paymentMethod: d.paymentMethod,
          deliveryMethod: d.deliveryMethod,
          status: orderStatus,
          currency: hold.currency,
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
          subtotalGrossCents: totals.subtotalCents,
          shippingCents: totals.shippingCents,
          taxAmountCents: totals.taxAmountCents,
          totalGrossCents: totals.totalCents,
          vatApplies: totals.vatApplies,
          idempotencyKey: d.idempotencyKey,
          items: {
            create: [
              totals.vatApplies
                ? {
                    productId: catalog.productId,
                    productVariantId: catalog.productVariantId,
                    skuSnapshot: catalog.sku,
                    productTitleSnapshot: hold.lineTitle,
                    unitPriceGrossCents: unitGross,
                    taxRatePercentSnapshot: catalog.taxRatePercent,
                    quantity: hold.seatCount,
                    lineTotalGrossCents: hold.seatCount * unitGross,
                  }
                : {
                    productId: catalog.productId,
                    productVariantId: catalog.productVariantId,
                    skuSnapshot: catalog.sku,
                    productTitleSnapshot: hold.lineTitle,
                    unitPriceGrossCents: netCentsFromGross(unitGross, catalog.taxRatePercent),
                    taxRatePercentSnapshot: 0,
                    quantity: hold.seatCount,
                    lineTotalGrossCents:
                      hold.seatCount * netCentsFromGross(unitGross, catalog.taxRatePercent),
                  },
            ],
          },
          statusHistory: {
            create: [{ fromStatus: null, toStatus: orderStatus }],
          },
          events: {
            create: [
              {
                eventType: ORDER_EVENT_PLACED,
                metadata: { orderNumber, channel: "workshop_checkout", workshopBookingId: bookingId },
              },
            ],
          },
        },
      });
      newOrderId = created.id;

      await tx.workshopBooking.update({
        where: { id: bookingId },
        data: {
          orderId: created.id,
          contactEmail: d.email.toLowerCase(),
          customerId: customerId ?? undefined,
        },
      });

      if (isFree) {
        await confirmWorkshopBookingAfterOrderPaid(tx, { orderId: created.id });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "hold_invalid") {
      return {
        ok: false,
        error: "Deine Platz-Reservierung ist abgelaufen. Bitte erneut buchen.",
      };
    }
    log.error("workshop_order_create_failed", { bookingId, ...errorMeta(e) });
    return { ok: false, error: "Bestellung konnte nicht gespeichert werden." };
  }

  await clearWorkshopBookingHoldCookie();

  revalidatePath("/termine");
  revalidatePath(`/termine/${hold.sessionId}`);
  revalidatePath("/admin/termine");
  revalidatePath("/admin/orders");

  if (isFree) {
    await sendOrderConfirmationIfNeeded(newOrderId);
    await sendWorkshopBookingConfirmationIfNeeded(newOrderId);
    return { ok: true, paymentReady: false, orderNumber };
  }

  try {
    const started = await startPayPalCheckoutOrderFromForm({
      d,
      shopCustomerId: customerId,
      internalOrderId: newOrderId,
      orderNumber,
      totalGrossCents: totals.totalCents,
      currency: hold.currency,
    });
    await prisma.orderPayment.create({
      data: {
        orderId: newOrderId,
        provider: "paypal",
        providerRef: started.paypalOrderId,
        status: "pending",
        amountGrossCents: totals.totalCents,
        currency: hold.currency,
      },
    });

    return {
      ok: true,
      paymentReady: true,
      orderNumber,
      internalOrderId: newOrderId,
      paypalOrderId: started.paypalOrderId,
      approvalUrl: started.approvalUrl,
      payerActionUrl: started.payerActionUrl ?? undefined,
    };
  } catch (e) {
    log.error("workshop_paypal_create_failed", { orderId: newOrderId, ...errorMeta(e) });
    return {
      ok: false,
      error: paypalOrderCreateUserMessage(e, surface),
    };
  }
}
