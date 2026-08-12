import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site/canonical-origin", () => ({
  canonicalSiteOrigin: () => "https://shop.example",
}));

vi.mock("@/lib/payments/paypal-access-token", () => ({
  getPayPalAccessToken: async () => "access-token",
}));

vi.mock("@/lib/payments/paypal-config", () => ({
  paypalApiBaseUrl: () => "https://api-m.sandbox.paypal.com",
}));

describe("createPayPalCheckoutOrder", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("nutzt ohne Express weiterhin NO_SHIPPING", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        bodies.push(JSON.parse(String((init as RequestInit).body)));
        return Response.json({ id: "PAYPAL-1", links: [] });
      }),
    );

    const { createPayPalCheckoutOrder } = await import("@/lib/payments/paypal-orders");
    await createPayPalCheckoutOrder({
      internalOrderId: "order-1",
      orderNumber: "J-1",
      totalGrossCents: 1299,
      currency: "EUR",
    });

    expect(bodies[0]).toMatchObject({
      application_context: { shipping_preference: "NO_SHIPPING" },
    });
  });

  it("setzt für Express GET_FROM_FILE", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        bodies.push(JSON.parse(String((init as RequestInit).body)));
        return Response.json({ id: "PAYPAL-EXPRESS-1", links: [] });
      }),
    );

    const { createPayPalCheckoutOrder } = await import("@/lib/payments/paypal-orders");
    await createPayPalCheckoutOrder({
      internalOrderId: "order-2",
      orderNumber: "J-2",
      totalGrossCents: 2499,
      currency: "EUR",
      shippingPreference: "GET_FROM_FILE",
    });

    expect(bodies[0]).toMatchObject({
      application_context: { shipping_preference: "GET_FROM_FILE" },
    });
  });
});
