import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payments/paypal-access-token", () => ({
  getPayPalAccessToken: async () => "access-token",
}));

vi.mock("@/lib/payments/paypal-config", () => ({
  paypalApiBaseUrl: () => "https://api-m.sandbox.paypal.com",
}));

const declinedBody = {
  id: "PAYPAL-1",
  status: "COMPLETED",
  purchase_units: [
    {
      custom_id: "ord-1",
      amount: { currency_code: "EUR", value: "19.90" },
      payments: {
        captures: [
          {
            id: "CAP-DECLINED",
            status: "DECLINED",
            amount: { currency_code: "EUR", value: "19.90" },
          },
        ],
      },
    },
  ],
};

const completedBody = {
  id: "PAYPAL-1",
  status: "COMPLETED",
  purchase_units: [
    {
      custom_id: "ord-1",
      amount: { currency_code: "EUR", value: "19.90" },
      payments: {
        captures: [
          {
            id: "CAP-OK",
            status: "COMPLETED",
            amount: { currency_code: "EUR", value: "19.90" },
          },
        ],
      },
    },
  ],
};

describe("capturePayPalCheckoutOrder", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wirft bei HTTP 201 mit DECLINED-Capture", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(declinedBody, { status: 201 })),
    );

    const { capturePayPalCheckoutOrder } = await import("@/lib/payments/paypal-orders");
    await expect(capturePayPalCheckoutOrder("PAYPAL-1")).rejects.toThrow(/abgelehnt \(DECLINED\)/);
  });

  it("liefert COMPLETED-Capture", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(completedBody, { status: 201 })),
    );

    const { capturePayPalCheckoutOrder } = await import("@/lib/payments/paypal-orders");
    await expect(capturePayPalCheckoutOrder("PAYPAL-1")).resolves.toEqual({
      paypalOrderId: "PAYPAL-1",
      internalOrderId: "ord-1",
      amountValue: "19.90",
      currencyCode: "EUR",
      captureId: "CAP-OK",
    });
  });
});
