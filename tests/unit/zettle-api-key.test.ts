import { describe, expect, it } from "vitest";
import { parseZettleApiKeyClaims } from "@/features/inventory/infrastructure/zettle-api-key";
import {
  buildZettleApiKeyDeepLink,
  getZettleConfigDiagnostics,
} from "@/features/inventory/infrastructure/zettle-config";

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("parseZettleApiKeyClaims", () => {
  it("liest client_id aus dem JWT-Payload", () => {
    const token = fakeJwt({
      client_id: "c55de605-48b6-42ef-b69e-cd9d14ded15a",
      scope: "READ:PRODUCT",
    });
    const claims = parseZettleApiKeyClaims(token);
    expect(claims.clientId).toBe("c55de605-48b6-42ef-b69e-cd9d14ded15a");
  });

  it("fällt auf iss zurück", () => {
    const token = fakeJwt({ iss: "org-client-uuid-12345678" });
    expect(parseZettleApiKeyClaims(token).clientId).toBe("org-client-uuid-12345678");
  });

  it("wirft bei ungültigem Token", () => {
    expect(() => parseZettleApiKeyClaims("not-a-jwt")).toThrow(/JWT/);
  });
});

describe("zettle-config", () => {
  it("baut Deep-Link mit Scopes", () => {
    const link = buildZettleApiKeyDeepLink("Test");
    expect(link).toContain("my.zettle.com/apps/api-keys");
    expect(link).toContain("READ:PRODUCT");
    expect(link).toContain("READ:PURCHASE");
  });

  it("liefert Diagnostics ohne Env", () => {
    const d = getZettleConfigDiagnostics();
    expect(d.apiKeyDeepLink).toContain("api-keys");
  });
});
