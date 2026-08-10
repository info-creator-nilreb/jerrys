import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findUnique = vi.fn();
const getSnapshot = vi.fn();
const completeFlow = vi.fn();

vi.mock("@/lib/payments/paypal-config", () => ({
  isPayPalConfigured: () => true,
}));

vi.mock("@/lib/payments/paypal-orders", () => ({
  getPayPalCheckoutOrderSnapshot: (...args: unknown[]) => getSnapshot(...args),
}));

vi.mock("@/lib/checkout/complete-paypal-capture-flow", () => ({
  completePayPalCaptureFlow: (...args: unknown[]) => completeFlow(...args),
}));

import { reconcilePendingPayPalPayments } from "@/lib/orders/reconcile-pending-paypal-payments";

describe("reconcilePendingPayPalPayments", () => {
  beforeEach(() => {
    findMany.mockReset();
    findUnique.mockReset();
    getSnapshot.mockReset();
    completeFlow.mockReset();
  });

  function prisma() {
    return {
      order: { findMany, findUnique },
    } as never;
  }

  it("finalisiert APPROVED/COMPLETED Orders", async () => {
    findMany.mockResolvedValue([
      {
        id: "o1",
        orderNumber: "J-1",
        status: "pending_payment",
        payments: [{ providerRef: "PAYPAL-1", status: "pending" }],
      },
    ]);
    getSnapshot.mockResolvedValue({
      paypalOrderId: "PAYPAL-1",
      status: "COMPLETED",
      isCompleted: true,
      isApproved: false,
    });
    completeFlow.mockResolvedValue({ ok: true, orderNumber: "J-1" });

    const result = await reconcilePendingPayPalPayments(prisma(), { limit: 10 });
    expect(result.scanned).toBe(1);
    expect(result.finalized).toBe(1);
    expect(completeFlow).toHaveBeenCalledWith("PAYPAL-1", {
      eventSource: "paypal_reconciliation",
    });
  });

  it("zählt noch offene PayPal-Orders als still_open", async () => {
    findMany.mockResolvedValue([
      {
        id: "o2",
        orderNumber: "J-2",
        status: "pending_payment",
        payments: [{ providerRef: "PAYPAL-2", status: "pending" }],
      },
    ]);
    getSnapshot.mockResolvedValue({
      paypalOrderId: "PAYPAL-2",
      status: "CREATED",
      isCompleted: false,
      isApproved: false,
    });

    const result = await reconcilePendingPayPalPayments(prisma());
    expect(result.stillOpen).toBe(1);
    expect(completeFlow).not.toHaveBeenCalled();
  });
});
