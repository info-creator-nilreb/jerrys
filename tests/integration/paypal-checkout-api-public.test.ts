import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

/**
 * Öffentliche Checkout-APIs: keine Session, aber keine 500er bei ungültigen Anfragen
 * und ohne PayPal-Konfiguration kontrollierte Antwort (kein unkontrollierter Fehlerpfad).
 */
describe("PayPal Checkout API (öffentlich)", () => {
  async function withoutPayPalEnv<T>(fn: () => Promise<T>): Promise<T> {
    const prevId = process.env.PAYPAL_CLIENT_ID;
    const prevSec = process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    try {
      return await fn();
    } finally {
      if (prevId === undefined) delete process.env.PAYPAL_CLIENT_ID;
      else process.env.PAYPAL_CLIENT_ID = prevId;
      if (prevSec === undefined) delete process.env.PAYPAL_CLIENT_SECRET;
      else process.env.PAYPAL_CLIENT_SECRET = prevSec;
    }
  }

  it(
    "POST /api/checkout/paypal/create-order ohne PayPal-Konfiguration → 503",
    async () => {
      await withoutPayPalEnv(async () => {
        const { POST } = await import("@/app/api/checkout/paypal/create-order/route");
        const req = new NextRequest("http://127.0.0.1/api/checkout/paypal/create-order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        const res = await POST(req);
        expect(res.status).toBe(503);
      });
    },
    20_000,
  );

  it(
    "POST /api/checkout/paypal/capture-order ohne PayPal-Konfiguration → 503",
    async () => {
      await withoutPayPalEnv(async () => {
        const { POST } = await import("@/app/api/checkout/paypal/capture-order/route");
        const req = new NextRequest("http://127.0.0.1/api/checkout/paypal/capture-order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        const res = await POST(req);
        expect(res.status).toBe(503);
      });
    },
    20_000,
  );
});
