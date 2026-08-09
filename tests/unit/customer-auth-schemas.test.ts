import { describe, expect, it } from "vitest";
import {
  customerMagicLinkRequestSchema,
  customerPasswordLoginSchema,
  customerRegisterSchema,
} from "@/features/customers";

describe("customer auth schemas", () => {
  it("akzeptiert gültige Registrierung und normalisiert E-Mail", () => {
    const parsed = customerRegisterSchema.safeParse({
      email: "Ada@Example.com",
      password: "secure-pass",
      firstName: "Ada",
      lastName: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("ada@example.com");
      expect(parsed.data.lastName).toBeUndefined();
    }
  });

  it("lehnt schwaches Passwort ab", () => {
    const parsed = customerRegisterSchema.safeParse({
      email: "a@b.co",
      password: "short",
    });
    expect(parsed.success).toBe(false);
  });

  it("validiert Login und Magic-Link-Request", () => {
    expect(
      customerPasswordLoginSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true);
    expect(customerMagicLinkRequestSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });
});
