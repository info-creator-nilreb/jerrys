import { beforeEach, describe, expect, it, vi } from "vitest";

const sendOrderConfirmationIfNeeded = vi.fn();
const sendWorkshopBookingConfirmationIfNeeded = vi.fn();
const capturePayPalCheckoutOrder = vi.fn();
const finalizeOrderAfterPendingPaymentCapture = vi.fn();
const beginWebhookInboxProcessing = vi.fn();
const markWebhookInboxFailed = vi.fn();
const markWebhookInboxProcessed = vi.fn();
const getCartIdFromCookie = vi.fn();
const orderFindUnique = vi.fn();
const cartLineDeleteMany = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/cart/cart-cookie", () => ({
  getCartIdFromCookie: () => getCartIdFromCookie(),
}));

vi.mock("@/lib/email/order-confirmation", () => ({
  sendOrderConfirmationIfNeeded: (...args: unknown[]) => sendOrderConfirmationIfNeeded(...args),
}));

vi.mock("@/lib/email/workshop-booking-emails", () => ({
  sendWorkshopBookingConfirmationIfNeeded: (...args: unknown[]) =>
    sendWorkshopBookingConfirmationIfNeeded(...args),
}));

vi.mock("@/lib/payments/paypal-orders", () => ({
  capturePayPalCheckoutOrder: (...args: unknown[]) => capturePayPalCheckoutOrder(...args),
}));

vi.mock("@/lib/orders/finalize-pending-payment", () => ({
  finalizeOrderAfterPendingPaymentCapture: (...args: unknown[]) =>
    finalizeOrderAfterPendingPaymentCapture(...args),
}));

vi.mock("@/features/integrations", () => ({
  beginWebhookInboxProcessing: (...args: unknown[]) => beginWebhookInboxProcessing(...args),
  markWebhookInboxFailed: (...args: unknown[]) => markWebhookInboxFailed(...args),
  markWebhookInboxProcessed: (...args: unknown[]) => markWebhookInboxProcessed(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    order: { findUnique: orderFindUnique },
    cartLine: { deleteMany: cartLineDeleteMany },
  }),
}));

beforeEach(() => {
  sendOrderConfirmationIfNeeded.mockReset();
  sendWorkshopBookingConfirmationIfNeeded.mockReset();
  capturePayPalCheckoutOrder.mockReset();
  finalizeOrderAfterPendingPaymentCapture.mockReset();
  beginWebhookInboxProcessing.mockReset();
  markWebhookInboxFailed.mockReset();
  markWebhookInboxProcessed.mockReset();
  getCartIdFromCookie.mockReset();
  orderFindUnique.mockReset();
  cartLineDeleteMany.mockReset();

  capturePayPalCheckoutOrder.mockResolvedValue({
    internalOrderId: "ord-1",
    paypalOrderId: "PAYPAL-1",
    captureId: "CAP-1",
    amountValue: "19.90",
    currencyCode: "EUR",
  });
  orderFindUnique.mockResolvedValue({
    id: "ord-1",
    orderNumber: "J-100",
    status: "pending_payment",
    totalGrossCents: 1990,
    currency: "EUR",
  });
  getCartIdFromCookie.mockResolvedValue(null);
});

describe("completePayPalCaptureFlow Inbox-Dedupe", () => {
  it("sendet keine Mail wenn Capture bereits verarbeitet ist", async () => {
    beginWebhookInboxProcessing.mockResolvedValue({
      ok: true,
      entryId: "in-1",
      duplicate: true,
      alreadyProcessed: true,
      status: "processed",
    });

    const { completePayPalCaptureFlow } = await import(
      "@/lib/checkout/complete-paypal-capture-flow"
    );
    const result = await completePayPalCaptureFlow("PAYPAL-1", { eventSource: "paypal_webhook" });

    expect(result).toEqual({ ok: true, orderNumber: "J-100" });
    expect(finalizeOrderAfterPendingPaymentCapture).not.toHaveBeenCalled();
    expect(sendOrderConfirmationIfNeeded).not.toHaveBeenCalled();
  });

  it("sendet keine Mail bei parallelem In-Flight-Capture (received)", async () => {
    beginWebhookInboxProcessing.mockResolvedValue({
      ok: true,
      entryId: "in-1",
      duplicate: true,
      alreadyProcessed: false,
      status: "received",
    });

    const { completePayPalCaptureFlow } = await import(
      "@/lib/checkout/complete-paypal-capture-flow"
    );
    const result = await completePayPalCaptureFlow("PAYPAL-1", { eventSource: "paypal_return" });

    expect(result).toEqual({ ok: true, orderNumber: "J-100" });
    expect(finalizeOrderAfterPendingPaymentCapture).not.toHaveBeenCalled();
    expect(sendOrderConfirmationIfNeeded).not.toHaveBeenCalled();
    expect(sendWorkshopBookingConfirmationIfNeeded).not.toHaveBeenCalled();
  });

  it("finalisiert erneut nach failed Inbox und sendet die Bestätigung", async () => {
    beginWebhookInboxProcessing.mockResolvedValue({
      ok: true,
      entryId: "in-1",
      duplicate: true,
      alreadyProcessed: false,
      status: "failed",
    });
    finalizeOrderAfterPendingPaymentCapture.mockResolvedValue({ ok: true });
    markWebhookInboxProcessed.mockResolvedValue(undefined);
    sendOrderConfirmationIfNeeded.mockResolvedValue(undefined);
    sendWorkshopBookingConfirmationIfNeeded.mockResolvedValue(undefined);

    const { completePayPalCaptureFlow } = await import(
      "@/lib/checkout/complete-paypal-capture-flow"
    );
    const result = await completePayPalCaptureFlow("PAYPAL-1");

    expect(result).toEqual({ ok: true, orderNumber: "J-100" });
    expect(finalizeOrderAfterPendingPaymentCapture).toHaveBeenCalled();
    expect(sendOrderConfirmationIfNeeded).toHaveBeenCalledWith("ord-1");
  });
});
