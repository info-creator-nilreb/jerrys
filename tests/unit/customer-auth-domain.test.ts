import { describe, expect, it } from "vitest";
import {
  customerAuthTokenExpiresAt,
  CUSTOMER_AUTH_TOKEN_TTL_MS,
  generateCustomerAuthTokenSecret,
  hashCustomerAuthToken,
  isCustomerAuthTokenUsable,
  normalizeCustomerEmail,
  resolveAuthSubjectKind,
  validateCustomerPassword,
  getCustomerPasswordCriteria,
  CUSTOMER_PASSWORD_LENGTH_PARTIAL_MIN,
} from "@/features/customers";

describe("customer auth domain", () => {
  it("normalisiert E-Mails", () => {
    expect(normalizeCustomerEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("validiert Passwortregeln", () => {
    expect(validateCustomerPassword("short").ok).toBe(false);
    expect(validateCustomerPassword("nouppercase1").ok).toBe(false);
    expect(validateCustomerPassword("SecurePass1").ok).toBe(true);
  });

  it("bewertet Passwort-Kriterien für Live-Feedback", () => {
    expect(getCustomerPasswordCriteria("").every((c) => c.state === "idle")).toBe(true);
    const weak = getCustomerPasswordCriteria("abc");
    expect(weak.find((c) => c.id === "length")?.state).toBe("fail");
    const partial = getCustomerPasswordCriteria("a".repeat(CUSTOMER_PASSWORD_LENGTH_PARTIAL_MIN));
    expect(partial.find((c) => c.id === "length")?.state).toBe("partial");
    const strong = getCustomerPasswordCriteria("SecurePass1");
    expect(strong.every((c) => c.state === "pass")).toBe(true);
  });

  it("hasht Tokens deterministisch und nicht im Klartext", () => {
    const raw = generateCustomerAuthTokenSecret();
    expect(raw.length).toBeGreaterThan(20);
    const a = hashCustomerAuthToken(raw);
    const b = hashCustomerAuthToken(raw);
    expect(a).toBe(b);
    expect(a).not.toBe(raw);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("erkennt abgelaufene oder verbrauchte Tokens", () => {
    const now = new Date("2026-08-08T12:00:00.000Z");
    expect(
      isCustomerAuthTokenUsable({
        expiresAt: new Date(now.getTime() + 1000),
        consumedAt: null,
        now,
      }),
    ).toBe(true);
    expect(
      isCustomerAuthTokenUsable({
        expiresAt: new Date(now.getTime() - 1000),
        consumedAt: null,
        now,
      }),
    ).toBe(false);
    expect(
      isCustomerAuthTokenUsable({
        expiresAt: new Date(now.getTime() + 1000),
        consumedAt: now,
        now,
      }),
    ).toBe(false);
  });

  it("setzt Token-TTL auf eine Stunde", () => {
    const now = new Date("2026-08-08T12:00:00.000Z");
    expect(customerAuthTokenExpiresAt(now).getTime() - now.getTime()).toBe(
      CUSTOMER_AUTH_TOKEN_TTL_MS,
    );
  });

  it("löst subjectKind inkl. Legacy-Admin", () => {
    expect(resolveAuthSubjectKind("customer")).toBe("customer");
    expect(resolveAuthSubjectKind("admin")).toBe("admin");
    expect(resolveAuthSubjectKind(undefined)).toBe("admin");
    expect(resolveAuthSubjectKind("nope")).toBe("admin");
  });
});
