import { describe, expect, it } from "vitest";
import { parseCapturedPayPalOrder } from "@/lib/payments/paypal-refunds";

describe("parseCapturedPayPalOrder", () => {
  it("extrahiert Capture-ID und Betrag aus COMPLETED Order", () => {
    const parsed = parseCapturedPayPalOrder({
      id: "PAYPAL-ORDER-1",
      status: "COMPLETED",
      purchase_units: [
        {
          custom_id: "internal-order-1",
          amount: { currency_code: "EUR", value: "49.00" },
          payments: {
            captures: [
              {
                id: "CAPTURE-XYZ",
                amount: { currency_code: "EUR", value: "49.00" },
                status: "COMPLETED",
              },
            ],
          },
        },
      ],
    });

    expect(parsed).toEqual({
      paypalOrderId: "PAYPAL-ORDER-1",
      internalOrderId: "internal-order-1",
      amountValue: "49.00",
      currencyCode: "EUR",
      captureId: "CAPTURE-XYZ",
    });
  });

  it("lehnt nicht abgeschlossene Orders ab", () => {
    expect(
      parseCapturedPayPalOrder({
        id: "PAYPAL-ORDER-1",
        status: "APPROVED",
        purchase_units: [{ custom_id: "x", amount: { currency_code: "EUR", value: "1.00" } }],
      }),
    ).toBeNull();
  });

  it("lehnt COMPLETED Order mit abgelehntem Capture ab", () => {
    expect(
      parseCapturedPayPalOrder({
        id: "PAYPAL-ORDER-1",
        status: "COMPLETED",
        purchase_units: [
          {
            custom_id: "internal-order-1",
            amount: { currency_code: "EUR", value: "49.00" },
            payments: {
              captures: [
                {
                  id: "CAPTURE-DECLINED",
                  amount: { currency_code: "EUR", value: "49.00" },
                  status: "DECLINED",
                },
              ],
            },
          },
        ],
      }),
    ).toBeNull();
  });

  it("lehnt COMPLETED Order ohne Capture-Objekt ab", () => {
    expect(
      parseCapturedPayPalOrder({
        id: "PAYPAL-ORDER-1",
        status: "COMPLETED",
        purchase_units: [{ custom_id: "internal-order-1", amount: { currency_code: "EUR", value: "49.00" } }],
      }),
    ).toBeNull();
  });

  it("lehnt PENDING-Capture ab", () => {
    expect(
      parseCapturedPayPalOrder({
        id: "PAYPAL-ORDER-1",
        status: "COMPLETED",
        purchase_units: [
          {
            custom_id: "internal-order-1",
            amount: { currency_code: "EUR", value: "49.00" },
            payments: {
              captures: [
                {
                  id: "CAPTURE-PENDING",
                  amount: { currency_code: "EUR", value: "49.00" },
                  status: "PENDING",
                },
              ],
            },
          },
        ],
      }),
    ).toBeNull();
  });
});
