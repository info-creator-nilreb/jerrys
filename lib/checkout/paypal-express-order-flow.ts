import { createPendingPayPalOrderFromJsonBody } from "@/lib/checkout/create-pending-paypal-order-from-form";
import {
  expressAddressFromPayPalOrder,
  type ApplePayContactLike,
} from "@/lib/checkout/paypal-express-address";
import { completePayPalCaptureFlow } from "@/lib/checkout/complete-paypal-capture-flow";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { getPayPalCheckoutOrderDetails } from "@/lib/payments/paypal-orders";

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

function placeholderExpressCheckoutBody(idempotencyKey: string): Record<string, unknown> {
  return {
    email: "paypal-express@example.invalid",
    shippingFirstName: "PayPal",
    shippingLastName: "Express",
    shippingLine1: "Musterstrasse 1",
    shippingZip: "10115",
    shippingCity: "Berlin",
    shippingCountry: "DE",
    billingUseShipping: "on",
    phone: "",
    paymentMethod: "paypal",
    rechtlicheKenntnis: "on",
    idempotencyKey,
    checkoutPromotionCode: "",
  };
}

export async function createPayPalExpressOrder(params: {
  idempotencyKey?: unknown;
}): Promise<CreatePayPalExpressOrderResult> {
  const rawKey = typeof params.idempotencyKey === "string" ? params.idempotencyKey.trim() : "";
  const idempotencyKey = rawKey || crypto.randomUUID();

  const result = await createPendingPayPalOrderFromJsonBody(
    placeholderExpressCheckoutBody(idempotencyKey),
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
  if (address.shippingCountry !== "DE") {
    return { ok: false, code: "land" };
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

  await prisma.order.update({
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
    },
  });

  const capture = await completePayPalCaptureFlow(params.paypalOrderId, {
    eventSource: "paypal_smart_buttons",
  });
  if (!capture.ok) return capture;
  return { ok: true, orderNumber: capture.orderNumber };
}
