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

  it("legt SEPA mit payment_source.sepa_debit an und bevorzugt payer-action", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        bodies.push(JSON.parse(String((init as RequestInit).body)));
        return Response.json({
          id: "PAYPAL-SEPA-1",
          links: [
            { rel: "approve", href: "https://paypal.example/approve" },
            { rel: "payer-action", href: "https://paypal.example/sepa-mandat" },
          ],
        });
      }),
    );

    const { createPayPalCheckoutOrder, preferredPayPalRedirectUrl } = await import(
      "@/lib/payments/paypal-orders"
    );
    const created = await createPayPalCheckoutOrder({
      internalOrderId: "order-sepa",
      orderNumber: "J-SEPA",
      totalGrossCents: 1999,
      currency: "EUR",
      paymentSource: {
        type: "sepa_debit",
        name: "Max Muster",
        email: "kunde@example.com",
        address: {
          address_line_1: "Invalidenstr. 12",
          admin_area_2: "Berlin",
          postal_code: "10115",
          country_code: "DE",
        },
      },
    });

    expect(bodies[0]).toMatchObject({
      payment_source: {
        sepa_debit: {
          name: "Max Muster",
          email: "kunde@example.com",
          address: { country_code: "DE", postal_code: "10115" },
        },
      },
    });
    expect(bodies[0]).not.toHaveProperty("application_context");
    expect(created.payerActionUrl).toBe("https://paypal.example/sepa-mandat");
    expect(preferredPayPalRedirectUrl(created, "sepa")).toBe("https://paypal.example/sepa-mandat");
    expect(preferredPayPalRedirectUrl(created, "paypal")).toBe("https://paypal.example/approve");
  });

  it("hinterlegt Karten für eingeloggte Kunden per Vault ON_SUCCESS", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        bodies.push(JSON.parse(String((init as RequestInit).body)));
        return Response.json({ id: "PAYPAL-CARD-1", links: [] });
      }),
    );

    const { createPayPalCheckoutOrder } = await import("@/lib/payments/paypal-orders");
    await createPayPalCheckoutOrder({
      internalOrderId: "order-card",
      orderNumber: "J-CARD",
      totalGrossCents: 999,
      currency: "EUR",
      paymentSource: { type: "card_vault_on_success", customerId: "cust01" },
    });

    expect(bodies[0]).toMatchObject({
      payment_source: {
        card: {
          attributes: {
            customer: { id: "cust01" },
            vault: { store_in_vault: "ON_SUCCESS" },
          },
        },
      },
    });
  });
});
