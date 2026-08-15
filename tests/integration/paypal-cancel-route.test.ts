import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/checkout/cancel-pending-paypal-by-token", () => ({
  cancelPendingPayPalCheckoutByToken: vi.fn(async () => "cancelled"),
}));

vi.mock("@/lib/checkout/checkout-form-draft-cookie", async () => {
  const actual = await vi.importActual<typeof import("@/lib/checkout/checkout-form-draft-cookie")>(
    "@/lib/checkout/checkout-form-draft-cookie",
  );
  return {
    ...actual,
    loadCheckoutFormDraftForPayPalOrder: vi.fn(async () => ({
      v: 1 as const,
      email: "max@example.com",
      phone: "",
      deliveryMethod: "shipping" as const,
      shippingCountry: "DE",
      shippingPerson: { firstName: "Max", lastName: "Muster", company: "" },
      shippingAddressValues: { zip: "10115", city: "Berlin", line1: "Musterstraße 1", line2: "" },
      shippingAddressId: "",
      billingDifferent: false,
      billingCountry: "DE",
      billingPerson: { firstName: "Max", lastName: "Muster", company: "" },
      billingAddressValues: { zip: "10115", city: "Berlin", line1: "Musterstraße 1", line2: "" },
      billingAddressId: "",
      payPalSurface: "paypal" as const,
      committedPromoCode: "",
      declineAutomatic: false,
      rechtlicheKenntnis: true,
    })),
  };
});

describe("PayPal-Abbruch (Route)", () => {
  it("leitet mit token auf Checkout mit paypal=abbruch um", async () => {
    const { cancelPendingPayPalCheckoutByToken } = await import(
      "@/lib/checkout/cancel-pending-paypal-by-token"
    );
    const { GET } = await import("@/app/(storefront)/checkout/paypal-abbruch/route");
    const res = await GET(
      new Request("http://127.0.0.1/checkout/paypal-abbruch?token=PAYPAL-ORDER-1"),
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/checkout?paypal=abbruch");
    expect(cancelPendingPayPalCheckoutByToken).toHaveBeenCalledWith("PAYPAL-ORDER-1");
    expect(res.headers.get("set-cookie") ?? "").toContain("jerrys_checkout_form_draft");
  });

  it("leitet ohne token ebenfalls auf Checkout um", async () => {
    const { GET } = await import("@/app/(storefront)/checkout/paypal-abbruch/route");
    const res = await GET(new Request("http://127.0.0.1/checkout/paypal-abbruch"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location") ?? "").toContain("/checkout?paypal=abbruch");
  });
});
