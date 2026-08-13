import {
  defaultExpressShippingCountry,
  quoteExpressShippingForCart,
} from "@/lib/checkout/express-shipping-quote";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { patchPayPalCheckoutOrderAmount } from "@/lib/payments/paypal-orders";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";

const log = createLogger("checkout.paypal_express_shipping");

export type UpdateExpressShippingResult =
  | {
      ok: true;
      shippingCountry: string;
      shippingCents: number;
      totalGrossCents: number;
      currency: string;
    }
  | { ok: false; code: "warenkorb" | "land" | "bestellung" | "paypal"; message: string };

/**
 * Pending-Express-Bestellung + PayPal-Order auf Versand für das gewählte Lieferland bringen.
 */
export async function updatePayPalExpressShipping(params: {
  paypalOrderId: string;
  shippingCountry: unknown;
}): Promise<UpdateExpressShippingResult> {
  const quote = await quoteExpressShippingForCart(params.shippingCountry);
  if (!quote.ok) {
    return { ok: false, code: quote.code, message: quote.message };
  }

  const prisma = getPrisma();
  const payment = await prisma.orderPayment.findFirst({
    where: { provider: "paypal", providerRef: params.paypalOrderId.trim() },
    select: {
      id: true,
      orderId: true,
      order: {
        select: {
          id: true,
          status: true,
          currency: true,
        },
      },
    },
  });

  if (!payment || payment.order.status !== "pending_payment") {
    return { ok: false, code: "bestellung", message: "Offene Express-Bestellung nicht gefunden." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          shippingCountry: quote.shippingCountry,
          shippingCents: quote.shippingCents,
          subtotalGrossCents: quote.subtotalCents,
          totalGrossCents: quote.totalGrossCents,
        },
      });
      await tx.orderPayment.update({
        where: { id: payment.id },
        data: { amountGrossCents: quote.totalGrossCents },
      });
    });

    await patchPayPalCheckoutOrderAmount({
      paypalOrderId: params.paypalOrderId.trim(),
      totalGrossCents: quote.totalGrossCents,
      currency: quote.currency || payment.order.currency,
    });
  } catch (e) {
    log.error("express_shipping_update_failed", {
      paypalOrderId: params.paypalOrderId,
      ...errorMeta(e),
    });
    return {
      ok: false,
      code: "paypal",
      message: "Versandkosten konnten nicht aktualisiert werden.",
    };
  }

  return {
    ok: true,
    shippingCountry: quote.shippingCountry,
    shippingCents: quote.shippingCents,
    totalGrossCents: quote.totalGrossCents,
    currency: quote.currency,
  };
}

export async function resolveExpressPlaceholderCountry(
  preferred?: unknown,
): Promise<string> {
  const shipping = await getShopShippingSettings();
  const preferredNorm = String(preferred ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (preferredNorm.length === 2 && shipping.shippingCountryCodes.includes(preferredNorm)) {
    return preferredNorm;
  }
  return defaultExpressShippingCountry(shipping.shippingCountryCodes);
}
