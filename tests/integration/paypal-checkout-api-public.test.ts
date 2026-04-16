import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

/**
 * Öffentliche Checkout-APIs: keine Session, aber keine 500er bei ungültigen Anfragen
 * und ohne PayPal-Konfiguration kontrollierte Antwort (kein unkontrollierter Fehlerpfad).
 */
describe("PayPal Checkout API (öffentlich)", () => {
  it(
    "POST /api/checkout/paypal/create-order ohne PayPal-Konfiguration → 503",
    async () => {
    const { POST } = await import("@/app/api/checkout/paypal/create-order/route");
    const req = new NextRequest("http://127.0.0.1/api/checkout/paypal/create-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST /api/checkout/paypal/capture-order ohne PayPal-Konfiguration → 503", async () => {
    const { POST } = await import("@/app/api/checkout/paypal/capture-order/route");
    const req = new NextRequest("http://127.0.0.1/api/checkout/paypal/capture-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    },
    20_000,
  );
});
