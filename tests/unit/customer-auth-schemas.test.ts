import { describe, expect, it } from "vitest";
import {
  customerMagicLinkRequestSchema,
  customerPasswordLoginSchema,
  customerRegisterSchema,
} from "@/features/customers";

const validPassword = "SecurePass1";

describe("customer auth schemas", () => {
  it("akzeptiert gültige Registrierung und normalisiert E-Mail", () => {
    const parsed = customerRegisterSchema.safeParse({
      email: "Ada@Example.com",
      password: validPassword,
      passwordConfirm: validPassword,
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
      passwordConfirm: "short",
    });
    expect(parsed.success).toBe(false);
  });

  it("lehnt nicht übereinstimmende Passwörter ab", () => {
    const parsed = customerRegisterSchema.safeParse({
      email: "a@b.co",
      password: validPassword,
      passwordConfirm: "SecurePass2",
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
