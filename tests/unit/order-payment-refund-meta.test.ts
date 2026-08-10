import { describe, expect, it } from "vitest";
import {
  mergeOrderPaymentRefundMeta,
  readOrderPaymentRefundMeta,
} from "@/lib/payments/order-payment-refund-meta";

describe("order-payment-refund-meta", () => {
  it("liest Capture- und Refund-Felder", () => {
    const meta = readOrderPaymentRefundMeta({
      paypalCaptureId: "CAP-1",
      refundedCents: 500,
      refunds: [
        {
          id: "REF-1",
          amountCents: 500,
          idempotencyKey: "key-1",
          at: "2026-08-10T12:00:00.000Z",
          actor: "admin",
        },
      ],
    });
    expect(meta.paypalCaptureId).toBe("CAP-1");
    expect(meta.refundedCents).toBe(500);
    expect(meta.refunds).toHaveLength(1);
  });

  it("merged ohne bestehende Felder zu verlieren", () => {
    const merged = mergeOrderPaymentRefundMeta(
      { paypal_fee: "1.20", paypalCaptureId: "CAP-OLD" },
      { paypalCaptureId: "CAP-NEW", refundedCents: 100 },
    );
    expect(merged.paypal_fee).toBe("1.20");
    expect(merged.paypalCaptureId).toBe("CAP-NEW");
    expect(merged.refundedCents).toBe(100);
  });
});
