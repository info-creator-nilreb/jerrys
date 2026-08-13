import { describe, expect, it } from "vitest";
import { isInsecureAdminPassword } from "@/lib/security/insecure-admin-passwords";

describe("isInsecureAdminPassword", () => {
  it("flags the known seed default", () => {
    expect(isInsecureAdminPassword("change-me-now")).toBe(true);
  });

  it("allows normal passwords", () => {
    expect(isInsecureAdminPassword("a-strong-unique-pass")).toBe(false);
  });
});
