import { describe, expect, it } from "vitest";
import {
  extractPayPalOrderIdFromWebhookEvent,
  paypalWebhookIdConfigured,
  readPayPalWebhookHeaders,
} from "@/lib/payments/paypal-webhook-verify";

describe("readPayPalWebhookHeaders", () => {
  it("liefert null wenn Header fehlen", () => {
    expect(readPayPalWebhookHeaders(new Headers())).toBeNull();
  });

  it("liest alle PayPal-Signatur-Header", () => {
    const headers = new Headers({
      "paypal-transmission-id": "tid-1",
      "paypal-transmission-time": "2026-01-01T00:00:00Z",
      "paypal-transmission-sig": "sig",
      "paypal-cert-url": "https://api.paypal.com/cert",
      "paypal-auth-algo": "SHA256withRSA",
    });
    expect(readPayPalWebhookHeaders(headers)).toEqual({
      transmissionId: "tid-1",
      transmissionTime: "2026-01-01T00:00:00Z",
      transmissionSig: "sig",
      certUrl: "https://api.paypal.com/cert",
      authAlgo: "SHA256withRSA",
    });
  });
});

describe("extractPayPalOrderIdFromWebhookEvent", () => {
  it("nutzt related_ids.order_id (Capture-Events)", () => {
    expect(
      extractPayPalOrderIdFromWebhookEvent({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAPTURE-1",
          supplementary_data: { related_ids: { order_id: "ORDER-99" } },
        },
      }),
    ).toBe("ORDER-99");
  });

  it("nutzt resource.id bei CHECKOUT.ORDER.APPROVED", () => {
    expect(
      extractPayPalOrderIdFromWebhookEvent({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "ORDER-42" },
      }),
    ).toBe("ORDER-42");
  });

  it("liefert null ohne brauchbare ID", () => {
    expect(
      extractPayPalOrderIdFromWebhookEvent({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: { id: "CAPTURE-1" },
      }),
    ).toBeNull();
  });
});

describe("paypalWebhookIdConfigured", () => {
  it("liest PAYPAL_WEBHOOK_ID", () => {
    const prev = process.env.PAYPAL_WEBHOOK_ID;
    process.env.PAYPAL_WEBHOOK_ID = " WH-123 ";
    try {
      expect(paypalWebhookIdConfigured()).toBe("WH-123");
    } finally {
      if (prev === undefined) delete process.env.PAYPAL_WEBHOOK_ID;
      else process.env.PAYPAL_WEBHOOK_ID = prev;
    }
  });
});
