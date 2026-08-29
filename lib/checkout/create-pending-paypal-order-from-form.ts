import { InsufficientStockError, reserveStockForOrder } from "@/features/inventory";
import { revalidatePath } from "next/cache";
import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartWithLines, cartLineCommerceRules } from "@/lib/cart/cart-queries";
import { cartAllowsPickup } from "@/lib/checkout/cart-pickup-eligibility";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/checkout/schemas";
import { generateOrderNumber } from "@/lib/checkout/order-number";
import { netCentsFromGross } from "@/lib/catalog/pricing";
import { sendOrderConfirmationIfNeeded } from "@/lib/email/order-confirmation";
import { ORDER_EVENT_PLACED } from "@/lib/orders/order-events";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { type PayPalShippingPreference } from "@/lib/payments/paypal-orders";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { usesPaypalHostedCheckout } from "@/lib/payments/online-payment-method";
import { orderPaymentCaptured } from "@/lib/orders/order-status-machine";
import { parseCheckoutPayPalSurface } from "@/lib/checkout/checkout-paypal-surface";
import { checkoutFormDraftFromCheckoutInput, type CheckoutFormDraft } from "@/lib/checkout/checkout-form-draft";
import {
  paymentSourceForCheckoutForm,
  paypalOrderCreateUserMessage,
  startPayPalCheckoutOrderFromForm,
} from "@/lib/checkout/paypal-order-payment-source";
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
      /** 3DS / SEPA-Mandat; Client oder Redirect nutzen diese URL wenn gesetzt. */
      payerActionUrl?: string;
      /** Checkout-Felder zum Wiederherstellen nach PayPal-Abbruch. */
      checkoutDraft?: CheckoutFormDraft;
    }
  /** Gleiche Idempotency erneut abgeschickt, Bestellung bereits erledigt (kein neuer PayPal-Start). */
  | { ok: true; paymentReady: false; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type CreatePendingPayPalOrderOptions = {
  paypalShippingPreference?: PayPalShippingPreference;
  orderEventChannel?: string;
  paymentFlow?: string;
  skipAddressBookSave?: boolean;
};

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
    deliveryMethod: fd(formData, "deliveryMethod"),
    rechtlicheKenntnis: fd(formData, "rechtlicheKenntnis"),
    idempotencyKey: fd(formData, "idempotencyKey"),
    checkoutPromotionCode: fd(formData, "checkoutPromotionCode"),
    checkoutDeclineAutomatic: fd(formData, "checkoutDeclineAutomatic"),
    saveShippingAddress: fd(formData, "saveShippingAddress"),
    saveBillingAddress: fd(formData, "saveBillingAddress"),
    checkoutPayPalSurface: fd(formData, "checkoutPayPalSurface"),
    paypalVaultId: fd(formData, "paypalVaultId"),
  };
}

/**
 * Optionales Ablegen der Checkout-Adresse im Adressbuch. Bewusst nach der Bestellung und
 * ohne Einfluss auf deren Ergebnis: Ein Fehler hier darf keine bezahlte Bestellung gefährden.
 */
async function saveCheckoutAddressesToAccountIfRequested(
  customerId: string | null,
  d: CheckoutFormInput,
): Promise<void> {
  if (!customerId) return;
  if (!d.saveShippingAddress && !d.saveBillingAddress) return;

  try {
    const { createCustomerAddress } = await import("@/features/customers");

    if (d.saveShippingAddress) {
      const result = await createCustomerAddress(customerId, {
        kind: "shipping",
        firstName: d.shippingFirstName,
        lastName: d.shippingLastName,
        company: d.shippingCompany,
        line1: d.shippingLine1,
        line2: d.shippingLine2,
        zip: d.shippingZip,
        city: d.shippingCity,
        country: d.shippingCountry,
      });
      if (!result.ok) {
        log.warn("checkout_address_save_rejected", { kind: "shipping", message: result.message });
      }
    }

    if (d.saveBillingAddress) {
      const result = await createCustomerAddress(customerId, {
        kind: "billing",
        firstName: d.billingFirstName,
        lastName: d.billingLastName,
        company: d.billingCompany,
        line1: d.billingLine1,
        line2: d.billingLine2,
        zip: d.billingZip,
        city: d.billingCity,
        country: d.billingCountry,
      });
      if (!result.ok) {
        log.warn("checkout_address_save_rejected", { kind: "billing", message: result.message });
      }
    }
  } catch (e) {
    log.warn("checkout_address_save_failed", { ...errorMeta(e) });
  }
}

async function loadVerifiedCheckoutCustomerId(): Promise<string | null> {
  try {
    const { getCustomerSession } = await import("@/lib/auth/customer-session");
    const { getVerifiedActiveCustomerId } = await import("@/features/customers");
    const session = await getCustomerSession();
    return session ? await getVerifiedActiveCustomerId(session.customerId) : null;
  } catch (e) {
    log.warn("checkout_customer_link_skipped", { error: String(e) });
    return null;
  }
}

export async function createPendingPayPalOrderFromFormData(
  formData: FormData,
  options: CreatePendingPayPalOrderOptions = {},
): Promise<CreatePendingPayPalOrderResult> {
  const raw = checkoutRawFromFormData(formData);
  return createPendingPayPalOrderFromParsedRaw(raw, options);
}

export async function createPendingPayPalOrderFromJsonBody(
  body: Record<string, unknown>,
  options: CreatePendingPayPalOrderOptions = {},
): Promise<CreatePendingPayPalOrderResult> {
  const fd = formDataFromRequestLike(body);
  const raw = checkoutRawFromFormData(fd);
  return createPendingPayPalOrderFromParsedRaw(raw, options);
}

async function createPendingPayPalOrderFromParsedRaw(
  raw: Record<string, unknown>,
  options: CreatePendingPayPalOrderOptions,
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

  const customerId = await loadVerifiedCheckoutCustomerId();
  const paymentSource = paymentSourceForCheckoutForm(d, customerId);
  if (!paymentSource.ok) {
    return { ok: false, error: paymentSource.error };
  }

  const usePaypalHostedCheckout = usesPaypalHostedCheckout(d.paymentMethod) && isPayPalConfigured();
  const surface = parseCheckoutPayPalSurface(d.checkoutPayPalSurface);

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
        const started = await startPayPalCheckoutOrderFromForm({
          d,
          shopCustomerId: customerId,
          internalOrderId: existing.id,
          orderNumber: existing.orderNumber,
          totalGrossCents: existing.totalGrossCents,
          currency: existing.currency,
          shippingPreference: options.paypalShippingPreference,
        });
        await getPrisma().orderPayment.create({
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
          checkoutDraft: checkoutFormDraftFromCheckoutInput(d),
        };
      } catch (e) {
        log.error("paypal_checkout_resume_failed", {
          orderId: existing.id,
          ...errorMeta(e),
        });
        return { ok: false, error: paypalOrderCreateUserMessage(e, surface) };
      }
    }

    log.info("submit_idempotent_hit", {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      status: existing.status,
    });
    if (!orderPaymentCaptured(existing.status)) {
      return {
        ok: false,
        error:
          "Die vorherige Zahlung ist nicht abgeschlossen. Es wurde nichts abgebucht. Bitte erneut versuchen.",
      };
    }
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

  if (d.deliveryMethod === "pickup" && !cartAllowsPickup(activeLines)) {
    return {
      ok: false,
      error: "Bitte Eingaben prüfen.",
      fieldErrors: {
        deliveryMethod:
          "Abholung ist für mindestens einen Artikel im Warenkorb nicht möglich. Bitte Versand wählen.",
      },
    };
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
    const commerce = cartLineCommerceRules(line);
    if (line.quantity > commerce.availableQuantity) {
      return {
        ok: false,
        error: `Nicht genug verfügbarer Bestand für „${line.product.title}“. Bitte Menge anpassen.`,
      };
    }
  }

  const lineInputs: OrderPriceLineInput[] = activeLines.map((line) => {
    const commerce = cartLineCommerceRules(line);
    return {
      quantity: line.quantity,
      priceGrossCents: commerce.priceGrossCents,
      taxRatePercent: commerce.taxRatePercent,
    };
  });

  const prisma = getPrisma();
  const codeNorm = normalizePromotionCode(d.checkoutPromotionCode ?? "");
  const { automaticCandidates, codePromotion } = await loadPromotionsForCheckoutResolve(
    prisma,
    codeNorm.length > 0 ? codeNorm : null,
  );

  const now = new Date();
  const shippingCountryNorm = d.shippingCountry.trim().toUpperCase();
  if (codeNorm.length > 0) {
    const ev = evaluatePromotionCodeEntry(codeNorm, codePromotion, lineInputs, now, shippingCountryNorm);
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
    deliveryMethod: d.deliveryMethod,
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
          customerId,
          paymentMethod: d.paymentMethod,
          deliveryMethod: d.deliveryMethod,
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
              const commerce = cartLineCommerceRules(line);
              const variant = line.productVariant;
              if (vatApplies) {
                return {
                  productId: line.product.id,
                  productVariantId: variant.id,
                  skuSnapshot: variant.sku,
                  productTitleSnapshot: line.product.title,
                  unitPriceGrossCents: commerce.priceGrossCents,
                  taxRatePercentSnapshot: commerce.taxRatePercent,
                  quantity: line.quantity,
                  lineTotalGrossCents: line.quantity * commerce.priceGrossCents,
                };
              }
              const unitNet = netCentsFromGross(
                commerce.priceGrossCents,
                commerce.taxRatePercent,
              );
              return {
                productId: line.product.id,
                productVariantId: variant.id,
                skuSnapshot: variant.sku,
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
                metadata: { orderNumber, channel: options.orderEventChannel ?? "checkout" },
              },
            ],
          },
        },
      });
      newOrderId = created.id;

      await reserveStockForOrder(tx, {
        orderId: newOrderId,
        lines: activeLines.map((line) => ({
          productId: line.product.id,
          productVariantId: line.productVariant.id,
          quantity: line.quantity,
        })),
        correlationId: d.idempotencyKey,
      });

      if (resolved.kind === "applied") {
        await tx.promotion.update({
          where: { id: resolved.promotionId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Warenkorb erst nach erfolgreicher Zahlung leeren — bei PayPal-Abbruch
      // bleiben die Positionen für erneuten Checkout / andere Zahlungsart erhalten.
    });
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return {
        ok: false,
        error: "Ein Artikel ist nicht mehr in der gewünschten Menge verfügbar. Bitte Warenkorb prüfen.",
      };
    }
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
    paymentFlow: options.paymentFlow ?? "paypal_hosted",
  });

  if (!options.skipAddressBookSave) {
    await saveCheckoutAddressesToAccountIfRequested(customerId, d);
  }

  try {
    const started = await startPayPalCheckoutOrderFromForm({
      d,
      shopCustomerId: customerId,
      internalOrderId: newOrderId,
      orderNumber,
      totalGrossCents: totalGross,
      currency: orderCurrency,
      shippingPreference: options.paypalShippingPreference,
    });
    await getPrisma().orderPayment.create({
      data: {
        orderId: newOrderId,
        provider: "paypal",
        providerRef: started.paypalOrderId,
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
      paypalOrderId: started.paypalOrderId,
      approvalUrl: started.approvalUrl,
      payerActionUrl: started.payerActionUrl ?? undefined,
      checkoutDraft: checkoutFormDraftFromCheckoutInput(d),
    };
  } catch (e) {
    log.error("paypal_checkout_create_failed", {
      orderId: newOrderId,
      orderNumber,
      ...errorMeta(e),
    });
    return {
      ok: false,
      error: paypalOrderCreateUserMessage(e, surface),
    };
  }
}
