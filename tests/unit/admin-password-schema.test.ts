import { describe, expect, it } from "vitest";
import { adminChangePasswordSchema } from "@/lib/auth/admin-password-schema";

describe("adminChangePasswordSchema", () => {
  it("akzeptiert ein gültiges neues Passwort", () => {
    const parsed = adminChangePasswordSchema.safeParse({
      currentPassword: "OldPass1234",
      password: "NewPass1234",
      passwordConfirm: "NewPass1234",
    });
    expect(parsed.success).toBe(true);
  });

  it("lehnt abweichende Bestätigung ab", () => {
    const parsed = adminChangePasswordSchema.safeParse({
      currentPassword: "OldPass1234",
      password: "NewPass1234",
      passwordConfirm: "OtherPass12",
    });
    expect(parsed.success).toBe(false);
  });

  it("lehnt den Seed-Default ab", () => {
    const parsed = adminChangePasswordSchema.safeParse({
      currentPassword: "OldPass1234",
      password: "change-me-now",
      passwordConfirm: "change-me-now",
    });
    expect(parsed.success).toBe(false);
  });
});
