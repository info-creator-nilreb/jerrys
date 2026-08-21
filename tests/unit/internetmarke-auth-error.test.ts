import { describe, expect, it } from "vitest";
import {
  appendApiKeyDiagnostic,
  explainInternetmarkeAuthFailure,
  parseInternetmarkeErrorTitle,
} from "@/features/fulfillment";

const generic401 = JSON.stringify({
  status: 401,
  title: "genericUserAuthenticationError",
  detail:
    "The user account is not valid, is locked, the provided authorization token is not valid or the credentials are invalid",
});

describe("explainInternetmarkeAuthFailure", () => {
  it("erkennt genericUserAuthenticationError als Portokasse-Freigabe, nicht Developer-Portal", () => {
    const msg = explainInternetmarkeAuthFailure(401, generic401);
    expect(msg).toMatch(/Developer-Portal „Approved“ reicht nicht/i);
    expect(msg).toMatch(/Geschäftsanwendungen/i);
    expect(msg).toMatch(/portokasse\.deutschepost\.de/i);
    expect(parseInternetmarkeErrorTitle(generic401)).toBe("genericUserAuthenticationError");
  });

  it("unterscheidet ungültigen API Key am Gateway", () => {
    const msg = explainInternetmarkeAuthFailure(
      401,
      JSON.stringify({
        status: 401,
        title: "Unauthorized",
        detail: "API gateway says: Invalid client identifier {0}",
      }),
    );
    expect(msg).toMatch(/ungültiger API Key/i);
    expect(msg).toMatch(/INTERNETMARKE_CLIENT_ID/);
  });

  it("erklärt 500 als Pending-App oder Secret", () => {
    const msg = explainInternetmarkeAuthFailure(500, "internal");
    expect(msg).toMatch(/in progress|pending|Approved/i);
  });
});

describe("appendApiKeyDiagnostic", () => {
  it("bestätigt gültigen API Key wenn Products API OK", () => {
    const msg = appendApiKeyDiagnostic("Token abgelehnt (401).", { ok: true });
    expect(msg).toMatch(/Products API OK/i);
    expect(msg).toMatch(/Portokasse/i);
  });

  it("weist auf Env-Key hin wenn Products API 401 liefert", () => {
    const msg = appendApiKeyDiagnostic("Token abgelehnt (401).", { ok: false, status: 401 });
    expect(msg).toMatch(/INTERNETMARKE_CLIENT_ID/);
  });
});
