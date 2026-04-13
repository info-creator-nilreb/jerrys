import { describe, expect, it } from "vitest";
import { GET } from "@/app/(storefront)/checkout/paypal-rueckkehr/route";

describe("PayPal-Rückkehr (Route)", () => {
  it("leitet ohne token auf Checkout mit Fehlercode um", async () => {
    const res = await GET(new Request("http://127.0.0.1/checkout/paypal-rueckkehr"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/checkout");
    expect(loc).toContain("paypal=");
  });
});
