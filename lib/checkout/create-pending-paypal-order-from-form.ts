import { revalidatePath } from "next/cache";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartWithLines } from "@/lib/cart/cart-queries";
import { checkoutFormSchema } from "@/lib/checkout/schemas";
import { generateOrderNumber } from "@/lib/checkout/order-number";
import { netCentsFromGross } from "@/lib/catalog/pricing";
import { sendOrderConfirmationIfNeeded } from "@/lib/email/order-confirmation";
import { ORDER_EVENT_PLACED } from "@/lib/orders/order-events";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { createPayPalCheckoutOrder } from "@/lib/payments/paypal-orders";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { usesPaypalHostedCheckout } from "@/lib/payments/online-payment-method";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import { loadPromotionsForCheckoutResolve } from "@/lib/promotions/checkout-load";
import { computeCheckoutOrderTotalsWithDiscount } from "@/lib/promotions/checkout-totals";
import {
  evaluatePromotionCodeEntry,
  normalizePromotionCode,
  promotionValidationMessage,
  resolveCheckoutPromotion,
} from "@/lib/promotions/engine";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";
import { z } from "zod";

const log = createLogger("checkout.paypal_create");

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

export type CreatePendingPayPalOrderResult =
  | {
      ok: true;
      paymentReady: true;
      orderNumber: string;
      internalOrderId: string;
      paypalOrderId: string;
      /** Leer, wenn kein Wallet-Redirect (z. B. nur Advanced Card Fields). */
      approvalUrl: string;
    }
  /** Gleiche Idempotency erneut abgeschickt, Bestellung bereits erledigt (kein neuer PayPal-Start). */
  | { ok: true; paymentReady: false; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function formDataFromRequestLike(raw: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    fd.set(k, String(v));
  }
  return fd;
}

/**
 * `FormData.get` liefert `null`, wenn der Key fehlt (z. B. ausgeblendete Rechnungsfelder).
 * Zod `z.string().optional()` akzeptiert `undefined`, nicht `null` — daher normalisieren.
 */
function fd(formData: FormData, key: string): FormDataEntryValue | undefined {
  const v = formData.get(key);
  return v === null ? undefined : v;
}

/** Akzeptiert `FormData` oder flaches Objekt (z. B. aus JSON-Body). */
export function checkoutRawFromFormData(formData: FormData): Record<string, unknown> {
  return {
    email: fd(formData, "email"),
    shippingFirstName: fd(formData, "shippingFirstName"),
    shippingLastName: fd(formData, "shippingLastName"),
    shippingCompany: fd(formData, "shippingCompany"),
    shippingLine1: fd(formData, "shippingLine1"),
    shippingLine2: fd(formData, "shippingLine2"),
    shippingZip: fd(formData, "shippingZip"),
    shippingCity: fd(formData, "shippingCity"),
    shippingCountry: fd(formData, "shippingCountry") ?? "DE",
    billingUseShipping: fd(formData, "billingUseShipping"),
    billingFirstName: fd(formData, "billingFirstName"),
    billingLastName: fd(formData, "billingLastName"),
    billingCompany: fd(formData, "billingCompany"),
    billingLine1: fd(formData, "billingLine1"),
    billingLine2: fd(formData, "billingLine2"),
    billingZip: fd(formData, "billingZip"),
    billingCity: fd(formData, "billingCity"),
    billingCountry: fd(formData, "billingCountry"),
    phone: fd(formData, "phone"),
    paymentMethod: fd(formData, "paymentMethod"),
    rechtlicheKenntnis: fd(formData, "rechtlicheKenntnis"),
    idempotencyKey: fd(formData, "idempotencyKey"),
    checkoutPromotionCode: fd(formData, "checkoutPromotionCode"),
    checkoutDeclineAutomatic: fd(formData, "checkoutDeclineAutomatic"),
  };
}

export async function createPendingPayPalOrderFromFormData(
  formData: FormData,
): Promise<CreatePendingPayPalOrderResult> {
  const raw = checkoutRawFromFormData(formData);
  return createPendingPayPalOrderFromParsedRaw(raw);
}

export async function createPendingPayPalOrderFromJsonBody(
  body: Record<string, unknown>,
): Promise<CreatePendingPayPalOrderResult> {
  const fd = formDataFromRequestLike(body);
  const raw = checkoutRawFromFormData(fd);
  return createPendingPayPalOrderFromParsedRaw(raw);
}

async function createPendingPayPalOrderFromParsedRaw(
  raw: Record<string, unknown>,
): Promise<CreatePendingPayPalOrderResult> {
  const parsed = checkoutFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  if (!isPayPalConfigured()) {
    return {
      ok: false,
      error: "Eine kostenpflichtige Bestellung ist derzeit nicht möglich (Zahlungsanbieter nicht konfiguriert).",
    };
  }

  const usePaypalHostedCheckout = usesPaypalHostedCheckout(d.paymentMethod) && isPayPalConfigured();

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
    if (existing.status === "pending_payment" && usePaypalHostedCheckout) {
      if (!isPayPalConfigured()) {
        return {
          ok: false,
          error: "PayPal nicht konfiguriert.",
        };
      }
      try {
        const { paypalOrderId, approvalUrl: approvalUrlRaw } = await createPayPalCheckoutOrder({
          internalOrderId: existing.id,
          orderNumber: existing.orderNumber,
          totalGrossCents: existing.totalGrossCents,
          currency: existing.currency,
        });
        const approvalUrl = approvalUrlRaw ?? "";
        await getPrisma().orderPayment.create({
          data: {
            orderId: existing.id,
            provider: "paypal",
            providerRef: paypalOrderId,
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
          paypalOrderId,
          approvalUrl,
        };
      } catch (e) {
        log.error("paypal_checkout_resume_failed", {
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
    return { ok: true, paymentReady: false, orderNumber: existing.orderNumber };
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

  const shopShip = await getShopShippingSettings();
  const allowedCountries = shopShip.shippingCountryCodes;
  if (!allowedCountries.includes(d.shippingCountry)) {
    return {
      ok: false,
      error: "Bitte Eingaben prüfen.",
      fieldErrors: {
        shippingCountry: "Lieferung in dieses Land ist derzeit nicht verfügbar. Bitte anderes Land wählen.",
      },
    };
  }
  if (!allowedCountries.includes(d.billingCountry)) {
    return {
      ok: false,
      error: "Bitte Eingaben prüfen.",
      fieldErrors: {
        billingCountry: "Rechnungsadresse: dieses Land ist derzeit nicht verfügbar.",
      },
    };
  }

  for (const line of activeLines) {
    const p = line.product;
    if (line.quantity > p.availableQuantity) {
      return {
        ok: false,
        error: `Nicht genug verfügbarer Bestand für „${p.title}“. Bitte Menge anpassen.`,
      };
    }
  }

  const lineInputs: OrderPriceLineInput[] = activeLines.map((line) => ({
    quantity: line.quantity,
    priceGrossCents: line.product.priceGrossCents,
    taxRatePercent: line.product.taxRatePercent,
  }));

  const prisma = getPrisma();
  const codeNorm = normalizePromotionCode(d.checkoutPromotionCode ?? "");
  const { automaticCandidates, codePromotion } = await loadPromotionsForCheckoutResolve(
    prisma,
    codeNorm.length > 0 ? codeNorm : null,
  );

  const now = new Date();
  if (codeNorm.length > 0) {
    const ev = evaluatePromotionCodeEntry(codeNorm, codePromotion, lineInputs, now);
    if (ev.status === "invalid") {
      return {
        ok: false,
        error: "Bitte Eingaben prüfen.",
        fieldErrors: {
          checkoutPromotionCode: promotionValidationMessage(ev.reason),
        },
      };
    }
  }

  const resolved = resolveCheckoutPromotion({
    lines: lineInputs,
    shippingCountryCode: d.shippingCountry,
    now,
    promotionCode: codeNorm.length > 0 ? codeNorm : null,
    declineAutomatic: d.checkoutDeclineAutomatic,
    codePromotion: codeNorm.length > 0 ? codePromotion : null,
    automaticCandidates,
    shippingRatesCentsByCountry: shopShip.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shopShip.freeShippingFromSubtotalGrossCents,
  });

  const discountOff =
    resolved.kind === "applied" ? resolved.discountOffSubtotalCents : 0;
  const applyFreeShipping =
    resolved.kind === "applied" && resolved.promotionType === "free_shipping";

  const totals = computeCheckoutOrderTotalsWithDiscount({
    lines: lineInputs,
    shippingCountryCode: d.shippingCountry,
    shippingRatesCentsByCountry: shopShip.shippingRatesCentsByCountry,
    freeShippingFromSubtotalGrossCents: shopShip.freeShippingFromSubtotalGrossCents,
    discountOffSubtotalCents: discountOff,
    applyFreeShippingPromotion: applyFreeShipping,
  });

  const subtotal = totals.subtotalCents;
  const taxTotal = totals.taxAmountCents;
  const shippingCents = totals.shippingCents;
  const totalGross = totals.totalCents;
  const vatApplies = totals.vatApplies;
  const orderCurrency = activeLines[0]!.product.currency;

  const orderNumber = generateOrderNumber();

  let newOrderId = "";

  const orderStatus = "pending_payment";

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
          discountOffSubtotalCents: totals.discountOffSubtotalCents,
          promotionId:
            resolved.kind === "applied" ? resolved.promotionId : null,
          promotionTitleSnapshot:
            resolved.kind === "applied" ? resolved.title : null,
          promotionCodeSnapshot:
            resolved.kind === "applied" ? resolved.code : null,
          vatApplies,
          idempotencyKey: d.idempotencyKey,
          items: {
            create: activeLines.map((line) => {
              if (vatApplies) {
                return {
                  productId: line.product.id,
                  productTitleSnapshot: line.product.title,
                  unitPriceGrossCents: line.product.priceGrossCents,
                  taxRatePercentSnapshot: line.product.taxRatePercent,
                  quantity: line.quantity,
                  lineTotalGrossCents: line.quantity * line.product.priceGrossCents,
                };
              }
              const unitNet = netCentsFromGross(
                line.product.priceGrossCents,
                line.product.taxRatePercent,
              );
              return {
                productId: line.product.id,
                productTitleSnapshot: line.product.title,
                unitPriceGrossCents: unitNet,
                taxRatePercentSnapshot: 0,
                quantity: line.quantity,
                lineTotalGrossCents: line.quantity * unitNet,
              };
            }),
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

      if (resolved.kind === "applied") {
        await tx.promotion.update({
          where: { id: resolved.promotionId },
          data: { usageCount: { increment: 1 } },
        });
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
    paymentFlow: "paypal_hosted",
  });

  try {
    const { paypalOrderId, approvalUrl: approvalUrlRaw } = await createPayPalCheckoutOrder({
      internalOrderId: newOrderId,
      orderNumber,
      totalGrossCents: totalGross,
      currency: orderCurrency,
    });
    const approvalUrl = approvalUrlRaw ?? "";
    await getPrisma().orderPayment.create({
      data: {
        orderId: newOrderId,
        provider: "paypal",
        providerRef: paypalOrderId,
        status: "pending",
        amountGrossCents: totalGross,
        currency: orderCurrency,
      },
    });

    revalidatePath("/warenkorb");
    revalidatePath("/checkout");
    revalidatePath("/", "layout");
    revalidatePath("/produkte");
    revalidatePath("/admin/orders");

    await sendOrderConfirmationIfNeeded(newOrderId);

    return {
      ok: true,
      paymentReady: true,
      orderNumber,
      internalOrderId: newOrderId,
      paypalOrderId,
      approvalUrl,
    };
  } catch (e) {
    log.error("paypal_checkout_create_failed", {
      orderId: newOrderId,
      orderNumber,
      ...errorMeta(e),
    });
    return {
      ok: false,
      error:
        "Die Bestellung wurde angelegt, der Zahlungsstart ist fehlgeschlagen. Bitte mit derselben Bestellung erneut versuchen oder den Support kontaktieren.",
    };
  }
}
