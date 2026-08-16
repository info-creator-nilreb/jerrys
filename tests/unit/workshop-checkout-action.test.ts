import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/checkout/create-workshop-order-from-form", () => ({
  createWorkshopOrderFromFormData: vi.fn(),
}));

describe("submitWorkshopCheckout", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns paymentRedirectUrl instead of throwing redirect on free order", async () => {
    const { createWorkshopOrderFromFormData } = await import(
      "@/lib/checkout/create-workshop-order-from-form"
    );
    vi.mocked(createWorkshopOrderFromFormData).mockResolvedValue({
      ok: true,
      paymentReady: false,
      orderNumber: "WS-1001",
    });

    const { submitWorkshopCheckout } = await import(
      "@/app/(storefront)/checkout/termine/actions"
    );
    const result = await submitWorkshopCheckout(null, new FormData());

    expect(result).toEqual({
      ok: true,
      orderNumber: "WS-1001",
      paymentRedirectUrl: "/checkout/erfolg?nr=WS-1001",
    });
  });

  it("returns PayPal approval URL when payment is ready", async () => {
    const { createWorkshopOrderFromFormData } = await import(
      "@/lib/checkout/create-workshop-order-from-form"
    );
    vi.mocked(createWorkshopOrderFromFormData).mockResolvedValue({
      ok: true,
      paymentReady: true,
      orderNumber: "WS-1002",
      internalOrderId: "ord_1",
      paypalOrderId: "pp_1",
      approvalUrl: "https://paypal.example/approve",
    });

    const { submitWorkshopCheckout } = await import(
      "@/app/(storefront)/checkout/termine/actions"
    );
    const result = await submitWorkshopCheckout(null, new FormData());

    expect(result).toEqual({
      ok: true,
      orderNumber: "WS-1002",
      paymentRedirectUrl: "https://paypal.example/approve",
    });
  });

  it("leitet ohne Approval nicht auf die Erfolgsseite um", async () => {
    const { createWorkshopOrderFromFormData } = await import(
      "@/lib/checkout/create-workshop-order-from-form"
    );
    vi.mocked(createWorkshopOrderFromFormData).mockResolvedValue({
      ok: true,
      paymentReady: true,
      orderNumber: "WS-1003",
      internalOrderId: "ord_2",
      paypalOrderId: "pp_2",
      approvalUrl: "",
    });

    const { submitWorkshopCheckout } = await import(
      "@/app/(storefront)/checkout/termine/actions"
    );
    const result = await submitWorkshopCheckout(null, new FormData());

    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.error).toMatch(/Zahlung konnte nicht gestartet werden/);
    }
  });
});
