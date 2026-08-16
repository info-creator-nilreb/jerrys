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

  it("zählt abgelehntes Capture nicht als finalisierbar", async () => {
    findMany.mockResolvedValue([
      {
        id: "o3",
        orderNumber: "J-3",
        status: "pending_payment",
        payments: [{ providerRef: "PAYPAL-3", status: "pending" }],
      },
    ]);
    getSnapshot.mockResolvedValue({
      paypalOrderId: "PAYPAL-3",
      status: "COMPLETED",
      isCompleted: false,
      isApproved: false,
      isDeclined: true,
    });

    const result = await reconcilePendingPayPalPayments(prisma());
    expect(result.failed).toBe(1);
    expect(result.details[0]?.message).toBe("capture_declined");
    expect(completeFlow).not.toHaveBeenCalled();
  });
});
