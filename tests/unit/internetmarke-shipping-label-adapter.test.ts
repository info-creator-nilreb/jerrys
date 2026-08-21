import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInternetmarkeShippingLabelAdapter,
  createNotConfiguredShippingLabelAdapter,
  createShippingLabelPortFromEnv,
  type InternetmarkeEnvConfig,
} from "@/features/fulfillment";

const baseConfig: InternetmarkeEnvConfig = {
  clientId: "client",
  clientSecret: "secret",
  username: "user@example.com",
  password: "pw",
  productCode: 1,
  productPriceCents: 95,
  pageFormatId: 1,
  voucherLayout: "ADDRESS_ZONE",
};

const sampleAddresses = {
  sender: {
    name: "jerry's",
    addressLine1: "Stargarder Str. 16",
    postalCode: "10437",
    city: "Berlin",
    country: "DE",
  },
  receiver: {
    name: "Max Mustermann",
    addressLine1: "Musterstr. 1",
    postalCode: "80331",
    city: "München",
    country: "DE",
  },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createShippingLabelPortFromEnv", () => {
  it("fällt ohne Env auf NotConfigured zurück", async () => {
    vi.stubEnv("INTERNETMARKE_CLIENT_ID", "");
    const port = await createShippingLabelPortFromEnv();
    const res = await port.purchaseLabel({
      shipmentId: "s1",
      orderId: "o1",
      provider: "internetmarke",
      idempotencyKey: "k1",
      ...sampleAddresses,
    });
    expect(res).toMatchObject({ ok: false, error: "not_configured" });
  });
});

describe("InternetmarkeShippingLabelAdapter", () => {
  it("authentifiziert und kauft PDF mit directCheckout=true", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/user")) {
        return new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/app/shoppingcart/pdf")) {
        return new Response(
          JSON.stringify({
            link: "https://example.test/label.pdf",
            shoppingCart: {
              shopOrderId: "im:s1",
              voucherList: [{ voucherId: "V1", trackId: "T1" }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    };

    const port = createInternetmarkeShippingLabelAdapter({
      config: baseConfig,
      fetchImpl,
    });
    expect(port).not.toBeNull();

    const res = await port!.purchaseLabel({
      shipmentId: "s1",
      orderId: "o1",
      provider: "internetmarke",
      idempotencyKey: "im:s1",
      ...sampleAddresses,
    });

    expect(res).toEqual({
      ok: true,
      externalRef: "im:s1",
      trackingNumber: "T1",
      labelStorageKey: null,
      labelDownloadUrl: "https://example.test/label.pdf",
    });

    const authCall = calls.find((c) => c.url.endsWith("/user"));
    expect(authCall?.init?.method).toBe("POST");
    const authHeaders = authCall?.init?.headers as Record<string, string>;
    expect(authHeaders["Content-Type"]).toMatch(/x-www-form-urlencoded/i);
    expect(authHeaders["dhl-api-key"]).toBe("client");
    expect(String(authCall?.init?.body)).toContain("grant_type=client_credentials");

    const checkout = calls.find((c) => c.url.includes("/app/shoppingcart/pdf"));
    expect(checkout?.url).toContain("directCheckout=true");
    expect(checkout?.url).not.toContain("finalize=");
    const checkoutHeaders = checkout?.init?.headers as Record<string, string>;
    expect(checkoutHeaders["dhl-api-key"]).toBe("client");
    expect(checkoutHeaders.Authorization).toBe("Bearer tok");
    const body = JSON.parse(String(checkout?.init?.body)) as {
      type: string;
      positions: Array<{ address: { receiver: { country: string } } }>;
    };
    expect(body.type).toBe("AppShoppingCartPDFRequest");
    expect(body.positions[0]?.address.receiver.country).toBe("DEU");
  });

  it("kürzt shopOrderId auf max. 18 Zeichen für die DHL-API", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/user")) {
        return new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/app/shoppingcart/pdf")) {
        return new Response(
          JSON.stringify({
            link: "https://example.test/label.pdf",
            shoppingCart: {
              shopOrderId: "JR-A1B2C3-a1b2c3",
              voucherList: [{ voucherId: "V1", trackId: "T1" }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    };

    const port = createInternetmarkeShippingLabelAdapter({
      config: baseConfig,
      fetchImpl,
    })!;

    const longKey = `im:${"x".repeat(40)}`;
    const res = await port.purchaseLabel({
      shipmentId: "s1",
      orderId: "o1",
      provider: "internetmarke",
      idempotencyKey: longKey,
      ...sampleAddresses,
    });

    expect(res.ok).toBe(true);
    const checkout = calls.find((c) => c.url.includes("/app/shoppingcart/pdf"));
    const body = JSON.parse(String(checkout?.init?.body)) as { shopOrderId: string };
    expect(body.shopOrderId.length).toBeLessThanOrEqual(18);
    expect(body.shopOrderId).toBe(`im:${"x".repeat(15)}`);
  });

  it("voidet über POST /app/retoure mit shopOrderId", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200 },
        );
      }
      if (url.endsWith("/app/retoure")) {
        return new Response(JSON.stringify({ shopRetoureId: "R1" }), { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };

    const port = createInternetmarkeShippingLabelAdapter({
      config: baseConfig,
      fetchImpl,
    })!;

    const res = await port.voidLabel({
      shipmentId: "s1",
      provider: "internetmarke",
      externalRef: "im:s1",
      idempotencyKey: "void:s1",
    });
    expect(res).toEqual({ ok: true, shopRetoureId: "R1" });
  });

  it("meldet provider_rejected bei 401 inkl. Freigabe-Hinweis", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("unauthorized", { status: 401 });

    const port = createInternetmarkeShippingLabelAdapter({
      config: baseConfig,
      fetchImpl,
    })!;

    const res = await port.purchaseLabel({
      shipmentId: "s1",
      orderId: "o1",
      provider: "internetmarke",
      idempotencyKey: "k1",
      ...sampleAddresses,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("provider_rejected");
      expect(res.message).toMatch(/Geschäftsanwendung|Portokasse/i);
    }
  });

  it("NotConfigured bleibt unverändert nutzbar", async () => {
    const port = createNotConfiguredShippingLabelAdapter();
    const buy = await port.purchaseLabel({
      shipmentId: "s1",
      orderId: "o1",
      provider: "internetmarke",
      idempotencyKey: "k1",
      ...sampleAddresses,
    });
    expect(buy).toMatchObject({ ok: false, error: "not_configured" });
  });
});
