import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { __resetPayPalWebhookApiRateLimitForTests } from "@/lib/security/paypal-webhook-api-rate-limit";

vi.mock("@/lib/payments/paypal-webhook-verify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/paypal-webhook-verify")>();
  return {
    ...actual,
    verifyPayPalWebhookSignature: vi.fn(),
  };
});

vi.mock("@/lib/checkout/complete-paypal-capture-flow", () => ({
  completePayPalCaptureFlow: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: vi.fn(() => ({})),
}));

vi.mock("@/features/integrations", () => ({
  beginWebhookInboxProcessing: vi.fn(),
  markWebhookInboxFailed: vi.fn(),
  markWebhookInboxProcessed: vi.fn(),
}));

afterEach(() => {
  __resetPayPalWebhookApiRateLimitForTests();
  vi.clearAllMocks();
  delete process.env.PAYPAL_WEBHOOK_ID;
});

function webhookHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    "paypal-transmission-id": "tid-1",
    "paypal-transmission-time": "2026-01-01T00:00:00Z",
    "paypal-transmission-sig": "sig",
    "paypal-cert-url": "https://api.paypal.com/cert",
    "paypal-auth-algo": "SHA256withRSA",
  };
}

describe("POST /api/webhooks/paypal", () => {
  it("ohne PAYPAL_WEBHOOK_ID → 503", async () => {
    const { POST } = await import("@/app/api/webhooks/paypal/route");
    const req = new NextRequest("http://127.0.0.1/api/webhooks/paypal", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "webhook_not_configured" });
  });

  it("ohne Signatur-Header → 400", async () => {
    process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
    const { POST } = await import("@/app/api/webhooks/paypal/route");
    const req = new NextRequest("http://127.0.0.1/api/webhooks/paypal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "missing_headers" });
  });

  it("ungültige Signatur → 401", async () => {
    process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
    const { verifyPayPalWebhookSignature } = await import("@/lib/payments/paypal-webhook-verify");
    vi.mocked(verifyPayPalWebhookSignature).mockResolvedValue(false);

    const { POST } = await import("@/app/api/webhooks/paypal/route");
    const req = new NextRequest("http://127.0.0.1/api/webhooks/paypal", {
      method: "POST",
      headers: webhookHeaders(),
      body: JSON.stringify({ id: "EVT-1", event_type: "PAYMENT.CAPTURE.COMPLETED" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "invalid_signature" });
  });

  it("gültige Signatur + Capture-Event → Capture-Flow", async () => {
    process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
    const { verifyPayPalWebhookSignature } = await import("@/lib/payments/paypal-webhook-verify");
    vi.mocked(verifyPayPalWebhookSignature).mockResolvedValue(true);

    const { beginWebhookInboxProcessing, markWebhookInboxProcessed } = await import(
      "@/features/integrations"
    );
    vi.mocked(beginWebhookInboxProcessing).mockResolvedValue({
      ok: true,
      entryId: "inbox-1",
      duplicate: false,
    });

    const { completePayPalCaptureFlow } = await import(
      "@/lib/checkout/complete-paypal-capture-flow"
    );
    vi.mocked(completePayPalCaptureFlow).mockResolvedValue({
      ok: true,
      orderNumber: "J-100",
    });

    const { POST } = await import("@/app/api/webhooks/paypal/route");
    const body = {
      id: "EVT-OK-1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAP-1",
        supplementary_data: { related_ids: { order_id: "PAYPAL-ORDER-9" } },
      },
    };
    const req = new NextRequest("http://127.0.0.1/api/webhooks/paypal", {
      method: "POST",
      headers: webhookHeaders(),
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(completePayPalCaptureFlow).toHaveBeenCalledWith("PAYPAL-ORDER-9", {
      eventSource: "paypal_webhook",
    });
    expect(markWebhookInboxProcessed).toHaveBeenCalledWith({}, "inbox-1");
  });
});
