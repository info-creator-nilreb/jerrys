import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/payments/paypal-config", () => ({
  isPayPalConfigured: () => true,
}));

describe("POST /api/checkout/paypal/create-order (Content-Type)", () => {
  it(
    "mit falschem Content-Type → 415",
    async () => {
    const { POST } = await import("@/app/api/checkout/paypal/create-order/route");
    const req = new NextRequest("http://127.0.0.1/api/checkout/paypal/create-order", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "x",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    },
    20_000,
  );
});
