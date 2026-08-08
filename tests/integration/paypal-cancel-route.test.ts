import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/checkout/cancel-pending-paypal-by-token", () => ({
  cancelPendingPayPalCheckoutByToken: vi.fn(async () => "cancelled"),
}));

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
  });

  it("leitet ohne token ebenfalls auf Checkout um", async () => {
    const { GET } = await import("@/app/(storefront)/checkout/paypal-abbruch/route");
    const res = await GET(new Request("http://127.0.0.1/checkout/paypal-abbruch"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location") ?? "").toContain("/checkout?paypal=abbruch");
  });
});
