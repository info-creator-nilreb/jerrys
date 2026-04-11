import { describe, expect, it } from "vitest";
import {
  adminCustomerNumberLabel,
  customerKeyFromNormalizedEmail,
  normalizeAdminCustomerEmail,
} from "@/lib/admin/customer-queries";

describe("normalizeAdminCustomerEmail", () => {
  it("trimmt und wandelt in Kleinbuchstaben um", () => {
    expect(normalizeAdminCustomerEmail("  Foo@BAR.de  ")).toBe("foo@bar.de");
  });
});

describe("customerKeyFromNormalizedEmail", () => {
  it("liefert 12 hex-Zeichen kleingeschrieben", () => {
    const key = customerKeyFromNormalizedEmail("buyer@example.com");
    expect(key).toMatch(/^[0-9a-f]{12}$/);
  });

  it("ist deterministisch", () => {
    const a = customerKeyFromNormalizedEmail("a@b.co");
    const b = customerKeyFromNormalizedEmail("a@b.co");
    expect(a).toBe(b);
  });
});

describe("adminCustomerNumberLabel", () => {
  it("prefix K- und Großbuchstaben", () => {
    expect(adminCustomerNumberLabel("a1b2c3d4e5f6")).toBe("K-A1B2C3D4E5F6");
  });
});
