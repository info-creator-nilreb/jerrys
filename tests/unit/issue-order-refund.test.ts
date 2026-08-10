import { beforeEach, describe, expect, it, vi } from "vitest";

const refundPayPalCapture = vi.fn();
const resolvePayPalCaptureId = vi.fn();
const applyOrderStatusTransition = vi.fn();
const sendOrderRefundedIfNeeded = vi.fn();

vi.mock("@/lib/payments/paypal-refunds", () => ({
  refundPayPalCapture: (...args: unknown[]) => refundPayPalCapture(...args),
  resolvePayPalCaptureId: (...args: unknown[]) => resolvePayPalCaptureId(...args),
}));

vi.mock("@/lib/orders/apply-order-status-transition", () => ({
  applyOrderStatusTransition: (...args: unknown[]) => applyOrderStatusTransition(...args),
}));

vi.mock("@/lib/email/order-refunded", () => ({
  sendOrderRefundedIfNeeded: (...args: unknown[]) => sendOrderRefundedIfNeeded(...args),
}));

import { issueOrderRefund } from "@/lib/orders/issue-order-refund";

function makePrisma(order: Record<string, unknown>) {
  return {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
    },
    orderPayment: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        const payments = (order.payments as Array<{ id: string }>) ?? [];
        return payments.find((p) => p.id === where.id) ?? null;
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    orderEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    integrationOutboxMessage: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const self = makePrisma(order);
      return fn(self);
    }),
  } as never;
}

describe("issueOrderRefund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyOrderStatusTransition.mockResolvedValue({ ok: true });
  });

  it("führt PayPal-Teilerstattung aus und persistiert Metadata", async () => {
    refundPayPalCapture.mockResolvedValue({
      refundId: "REF-1",
      status: "COMPLETED",
      amountCents: 1000,
      currencyCode: "EUR",
    });

    const order = {
      id: "ord-1",
      status: "paid",
      currency: "EUR",
      totalGrossCents: 5000,
      payments: [
        {
          id: "pay-1",
          provider: "paypal",
          providerRef: "PAYPAL-ORDER",
          status: "succeeded",
          amountGrossCents: 5000,
          currency: "EUR",
          metadata: { paypalCaptureId: "CAP-1" },
        },
      ],
    };

    const prisma = makePrisma(order);
    const result = await issueOrderRefund(prisma, {
      orderId: "ord-1",
      amountCents: 1000,
      idempotencyKey: "idem-partial-001",
      actor: "admin",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.full).toBe(false);
    expect(result.remainingCents).toBe(4000);
    expect(refundPayPalCapture).toHaveBeenCalledWith(
      expect.objectContaining({ captureId: "CAP-1", amountCents: 1000 }),
    );
    expect(applyOrderStatusTransition).not.toHaveBeenCalled();
  });

  it("idempotent bei gleicher Request-Id", async () => {
    const order = {
      id: "ord-1",
      status: "paid",
      currency: "EUR",
      totalGrossCents: 5000,
      payments: [
        {
          id: "pay-1",
          provider: "paypal",
          providerRef: "PAYPAL-ORDER",
          status: "partially_refunded",
          amountGrossCents: 5000,
          currency: "EUR",
          metadata: {
            paypalCaptureId: "CAP-1",
            refundedCents: 1000,
            refunds: [
              {
                id: "REF-1",
                amountCents: 1000,
                idempotencyKey: "idem-same-001",
                at: "2026-08-10T12:00:00.000Z",
              },
            ],
          },
        },
      ],
    };

    const result = await issueOrderRefund(makePrisma(order), {
      orderId: "ord-1",
      amountCents: 1000,
      idempotencyKey: "same-key",
      actor: "admin",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alreadyProcessed).toBe(true);
    expect(refundPayPalCapture).not.toHaveBeenCalled();
  });

  it("manueller Vollrefund ohne PayPal", async () => {
    const order = {
      id: "ord-2",
      status: "completed",
      currency: "EUR",
      totalGrossCents: 2000,
      payments: [],
    };

    const result = await issueOrderRefund(makePrisma(order), {
      orderId: "ord-2",
      idempotencyKey: "idem-manual-0001",
      actor: "admin",
      manualOnly: true,
    });

    expect(result.ok).toBe(true);
    expect(applyOrderStatusTransition).toHaveBeenCalledWith(
      expect.anything(),
      "ord-2",
      "refunded",
    );
  });
});
