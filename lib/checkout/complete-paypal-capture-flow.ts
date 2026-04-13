import { revalidatePath } from "next/cache";
import { sendOrderConfirmationIfNeeded } from "@/lib/email/order-confirmation";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { finalizeOrderAfterPendingPaymentCapture } from "@/lib/orders/finalize-pending-payment";
import { capturePayPalCheckoutOrder } from "@/lib/payments/paypal-orders";

const log = createLogger("checkout.paypal_capture");

function moneyStringFromGrossCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export type CompletePayPalCaptureResult =
  | { ok: true; orderNumber: string }
  | { ok: false; code: "capture" | "bestellung" | "betrag" | "finalisierung" };

export type PayPalCaptureEventSource = "paypal_return" | "paypal_smart_buttons" | "paypal_card_fields";

/**
 * Nach PayPal-Zustimmung (Smart Buttons oder Return-URL): Capture, Betrag prüfen, Bestellung finalisieren, E-Mail.
 */
export async function completePayPalCaptureFlow(
  paypalOrderId: string,
  options?: { eventSource?: PayPalCaptureEventSource },
): Promise<CompletePayPalCaptureResult> {
  const eventSource: PayPalCaptureEventSource = options?.eventSource ?? "paypal_smart_buttons";
  let capture: Awaited<ReturnType<typeof capturePayPalCheckoutOrder>>;
  try {
    capture = await capturePayPalCheckoutOrder(paypalOrderId.trim());
  } catch (e) {
    log.error("paypal_capture_failed", { ...errorMeta(e) });
    return { ok: false, code: "capture" };
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: capture.internalOrderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalGrossCents: true,
      currency: true,
    },
  });

  if (!order) {
    log.error("paypal_order_not_found", { internalOrderId: capture.internalOrderId });
    return { ok: false, code: "bestellung" };
  }

  const expected = moneyStringFromGrossCents(order.totalGrossCents);
  if (
    capture.amountValue !== expected ||
    capture.currencyCode.toUpperCase() !== order.currency.trim().toUpperCase()
  ) {
    log.error("paypal_amount_mismatch", {
      orderId: order.id,
      expected,
      got: capture.amountValue,
      currency: capture.currencyCode,
    });
    return { ok: false, code: "betrag" };
  }

  const result = await finalizeOrderAfterPendingPaymentCapture(prisma, {
    orderId: order.id,
    provider: "paypal",
    providerRef: capture.paypalOrderId,
    eventSource,
  });

  if (!result.ok) {
    if (result.error === "invalid_status" || result.error === "not_found") {
      if (order.status === "paid") {
        return { ok: true, orderNumber: order.orderNumber };
      }
    }
    log.error("paypal_finalize_failed", { orderId: order.id, error: result.error });
    return { ok: false, code: "finalisierung" };
  }

  await sendOrderConfirmationIfNeeded(order.id);
  revalidatePath("/admin/orders");
  revalidatePath("/produkte");
  revalidatePath("/", "layout");

  return { ok: true, orderNumber: order.orderNumber };
}
