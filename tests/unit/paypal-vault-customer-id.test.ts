import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { paypalVaultCustomerId } from "@/lib/payments/paypal-vault-customer-id";

describe("paypalVaultCustomerId", () => {
  it("lässt kurze alphanumerische IDs unverändert", () => {
    expect(paypalVaultCustomerId("cust_123")).toBe("cust_123");
  });

  it("kürzt Shop-cuid auf 22 Zeichen per Hash", () => {
    const cuid = "clxxxxxxxxxxxxxxxxxxxxxxx";
    expect(cuid.length).toBeGreaterThan(22);
    const id = paypalVaultCustomerId(cuid);
    expect(id).toHaveLength(22);
    expect(id).toBe(createHash("sha256").update(`jerrys-pp-cust:${cuid}`).digest("hex").slice(0, 22));
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });
});
