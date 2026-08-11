import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";

const PREV_AUTH = process.env.AUTH_SECRET;
const PREV_KEY = process.env.INTEGRATIONS_ENCRYPTION_KEY;

afterEach(() => {
  if (PREV_AUTH === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = PREV_AUTH;
  if (PREV_KEY === undefined) delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
  else process.env.INTEGRATIONS_ENCRYPTION_KEY = PREV_KEY;
});

describe("secret-crypto", () => {
  it("rundtrip mit AUTH_SECRET-Ableitung", () => {
    delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    process.env.AUTH_SECRET = "test-auth-secret-for-crypto";
    const enc = encryptSecret("ig-token-value");
    expect(enc.startsWith("v1.")).toBe(true);
    expect(decryptSecret(enc)).toBe("ig-token-value");
  });

  it("rundtrip mit explizitem Hex-Key", () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "a".repeat(64);
    const enc = encryptSecret("hello");
    expect(decryptSecret(enc)).toBe("hello");
  });
});
