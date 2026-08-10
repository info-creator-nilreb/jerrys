import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const paymentUpdate = vi.fn();
const paymentUpdateMany = vi.fn();
const applyTransition = vi.fn();

vi.mock("@/lib/orders/apply-order-status-transition", () => ({
  applyOrderStatusTransition: (...args: unknown[]) => applyTransition(...args),
}));

import { applyPayPalCaptureRefundedWebhook } from "@/lib/orders/apply-paypal-capture-refunded-webhook";

describe("applyPayPalCaptureRefundedWebhook", () => {
  beforeEach(() => {
    findFirst.mockReset();
    paymentUpdate.mockReset();
    paymentUpdateMany.mockReset();
    applyTransition.mockReset();
  });

  function prisma() {
    return {
      orderPayment: {
        findFirst,
        update: paymentUpdate,
        updateMany: paymentUpdateMany,
      },
    } as never;
  }

  it("setzt Vollrefund auf Bestellstatus refunded", async () => {
    findFirst.mockResolvedValue({
      id: "pay-1",
      orderId: "ord-1",
      status: "succeeded",
      amountGrossCents: 5000,
      order: { id: "ord-1", status: "paid", totalGrossCents: 5000 },
    });
    applyTransition.mockResolvedValue({ ok: true });
    paymentUpdateMany.mockResolvedValue({ count: 1 });

    const result = await applyPayPalCaptureRefundedWebhook(prisma(), {
      paypalOrderId: "PAYPAL-1",
      refundAmountValue: "50.00",
    });

    expect(result).toEqual({ ok: true, action: "refunded" });
    expect(applyTransition).toHaveBeenCalledWith(expect.anything(), "ord-1", "refunded");
  });

  it("loggt Teilerstattung ohne Statuswechsel", async () => {
    findFirst.mockResolvedValue({
      id: "pay-1",
      orderId: "ord-1",
      status: "succeeded",
      amountGrossCents: 5000,
      order: { id: "ord-1", status: "paid", totalGrossCents: 5000 },
    });

    const result = await applyPayPalCaptureRefundedWebhook(prisma(), {
      paypalOrderId: "PAYPAL-1",
      refundAmountValue: "10.00",
    });

    expect(result).toEqual({ ok: true, action: "partial_logged" });
    expect(applyTransition).not.toHaveBeenCalled();
  });
});
