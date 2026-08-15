import { createPendingPayPalOrderFromJsonBody } from "@/lib/checkout/create-pending-paypal-order-from-form";
import { parseExpressDeliveryMethod, parseExpressPromotionInput } from "@/lib/checkout/express-promotion";
import {
  expressAddressFromPayPalOrder,
  type ApplePayContactLike,
} from "@/lib/checkout/paypal-express-address";
import {
  PAYPAL_EXPRESS_PLACEHOLDER_EMAIL,
  PAYPAL_EXPRESS_PLACEHOLDER_SHIPPING,
} from "@/lib/checkout/paypal-express-placeholder";
import { quoteExpressShippingForCart } from "@/lib/checkout/express-shipping-quote";
import { resolveExpressPlaceholderCountry } from "@/lib/checkout/paypal-express-update-shipping";
import { completePayPalCaptureFlow } from "@/lib/checkout/complete-paypal-capture-flow";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  getPayPalCheckoutOrderDetails,
  patchPayPalCheckoutOrderAmount,
} from "@/lib/payments/paypal-orders";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";

const log = createLogger("checkout.paypal_express");

export type CreatePayPalExpressOrderResult =
  | {
      ok: true;
      paymentReady: true;
      orderNumber: string;
      internalOrderId: string;
      paypalOrderId: string;
    }
  | { ok: true; paymentReady: false; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Technischer Checkout-Body bis PayPal Adresse/E-Mail liefert.
 * Erzeugt eine `pending_payment`-Bestellung (Bestand + PayPal-Order), aber
 * keine Admin-Kundenzeile — siehe `orderContributesToAdminCustomer`.
 */
function placeholderExpressCheckoutBody(
  idempotencyKey: string,
  shippingCountry: string,
  promotion: { promotionCode: string; declineAutomatic: boolean },
  deliveryMethod: string,
): Record<string, unknown> {
  return {
    email: PAYPAL_EXPRESS_PLACEHOLDER_EMAIL,
    ...PAYPAL_EXPRESS_PLACEHOLDER_SHIPPING,
    shippingCountry,
    billingUseShipping: "on",
    phone: "",
    paymentMethod: "paypal",
    deliveryMethod,
    rechtlicheKenntnis: "on",
    idempotencyKey,
    checkoutPromotionCode: promotion.promotionCode,
    checkoutDeclineAutomatic: promotion.declineAutomatic ? "1" : "",
  };
}

export async function createPayPalExpressOrder(params: {
  idempotencyKey?: unknown;
  /** Lieferland aus Wallet (Apple Pay) oder Default aus Shop-Versandeinstellungen. */
  shippingCountry?: unknown;
  promotionCode?: unknown;
  declineAutomatic?: unknown;
  deliveryMethod?: unknown;
}): Promise<CreatePayPalExpressOrderResult> {
  const rawKey = typeof params.idempotencyKey === "string" ? params.idempotencyKey.trim() : "";
  const idempotencyKey = rawKey || crypto.randomUUID();
  const shippingCountry = await resolveExpressPlaceholderCountry(params.shippingCountry);
  const promotion = parseExpressPromotionInput({
    promotionCode: params.promotionCode,
    declineAutomatic: params.declineAutomatic,
  });
  const deliveryMethod = parseExpressDeliveryMethod(params);

  const result = await createPendingPayPalOrderFromJsonBody(
    placeholderExpressCheckoutBody(idempotencyKey, shippingCountry, promotion, deliveryMethod),
    {
      paypalShippingPreference: "GET_FROM_FILE",
      orderEventChannel: "paypal_express",
      paymentFlow: "paypal_express",
      skipAddressBookSave: true,
    },
  );

  if (!result.ok) return result;
  if (!result.paymentReady) return result;

  return {
    ok: true,
    paymentReady: true,
    orderNumber: result.orderNumber,
    internalOrderId: result.internalOrderId,
    paypalOrderId: result.paypalOrderId,
  };
}

export type ApprovePayPalExpressOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; code: "paypal_order" | "adresse" | "land" | "bestellung" | "capture" | "betrag" | "finalisierung" };

export async function approvePayPalExpressOrder(params: {
  paypalOrderId: string;
  applePayShippingContact?: ApplePayContactLike | null;
  promotionCode?: unknown;
  declineAutomatic?: unknown;
  deliveryMethod?: unknown;
}): Promise<ApprovePayPalExpressOrderResult> {
  let paypalOrder: Awaited<ReturnType<typeof getPayPalCheckoutOrderDetails>>;
  try {
    paypalOrder = await getPayPalCheckoutOrderDetails(params.paypalOrderId);
  } catch (e) {
    log.error("paypal_express_order_load_failed", {
      paypalOrderId: params.paypalOrderId,
      ...errorMeta(e),
    });
    return { ok: false, code: "paypal_order" };
  }

  const address = expressAddressFromPayPalOrder(paypalOrder, params.applePayShippingContact);
  if (!address) {
    return { ok: false, code: "adresse" };
  }

  const shippingSettings = await getShopShippingSettings();
  if (!shippingSettings.shippingCountryCodes.includes(address.shippingCountry)) {
    return { ok: false, code: "land" };
  }

  const deliveryMethod = parseExpressDeliveryMethod(params);
  const quote = await quoteExpressShippingForCart(
    address.shippingCountry,
    parseExpressPromotionInput({
      promotionCode: params.promotionCode,
      declineAutomatic: params.declineAutomatic,
    }),
    deliveryMethod,
  );
  if (!quote.ok) {
    return { ok: false, code: quote.code === "land" ? "land" : "bestellung" };
  }

  const internalOrderId = paypalOrder.purchase_units?.[0]?.custom_id;
  if (!internalOrderId) {
    return { ok: false, code: "bestellung" };
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: internalOrderId },
    select: {
      id: true,
      currency: true,
      totalGrossCents: true,
      payments: {
        where: { provider: "paypal", providerRef: params.paypalOrderId },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!order || order.payments.length === 0) {
    return { ok: false, code: "bestellung" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          email: address.email,
          phone: address.phone,
          shippingFirstName: address.shippingFirstName,
          shippingLastName: address.shippingLastName,
          shippingCompany: address.shippingCompany,
          shippingLine1: address.shippingLine1,
          shippingLine2: address.shippingLine2,
          shippingZip: address.shippingZip,
          shippingCity: address.shippingCity,
          shippingCountry: address.shippingCountry,
          billingFirstName: address.billingFirstName,
          billingLastName: address.billingLastName,
          billingCompany: address.billingCompany,
          billingLine1: address.billingLine1,
          billingLine2: address.billingLine2,
          billingZip: address.billingZip,
          billingCity: address.billingCity,
          billingCountry: address.billingCountry,
          shippingCents: quote.shippingCents,
          subtotalGrossCents: quote.subtotalCents,
          totalGrossCents: quote.totalGrossCents,
          discountOffSubtotalCents: quote.discountOffSubtotalCents,
          deliveryMethod,
        },
      });
      await tx.orderPayment.updateMany({
        where: { orderId: order.id, provider: "paypal", providerRef: params.paypalOrderId },
        data: { amountGrossCents: quote.totalGrossCents },
      });
    });

    if (quote.totalGrossCents !== order.totalGrossCents) {
      await patchPayPalCheckoutOrderAmount({
        paypalOrderId: params.paypalOrderId,
        totalGrossCents: quote.totalGrossCents,
        currency: quote.currency || order.currency,
      });
    }
  } catch (e) {
    log.error("paypal_express_approve_totals_failed", {
      paypalOrderId: params.paypalOrderId,
      orderId: order.id,
      ...errorMeta(e),
    });
    return { ok: false, code: "betrag" };
  }

  const capture = await completePayPalCaptureFlow(params.paypalOrderId, {
    eventSource: "paypal_smart_buttons",
  });
  if (!capture.ok) return capture;
  return { ok: true, orderNumber: capture.orderNumber };
}
