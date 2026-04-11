import { describe, expect, it } from "vitest";
import { CONSENT_JSON_VERSION } from "@/lib/consent/constants";
import { buildConsentRecord, parseConsentJson, serializeConsent } from "@/lib/consent/storage";

describe("parseConsentJson", () => {
  it("akzeptiert gültige Consent-JSON", () => {
    const raw = JSON.stringify({
      v: CONSENT_JSON_VERSION,
      statistics: true,
      marketing: false,
      savedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parseConsentJson(raw)).toEqual({
      v: CONSENT_JSON_VERSION,
      statistics: true,
      marketing: false,
      savedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("lehnt veraltete Version ab", () => {
    const raw = JSON.stringify({
      v: CONSENT_JSON_VERSION + 99,
      statistics: true,
      marketing: true,
      savedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parseConsentJson(raw)).toBeNull();
  });

  it("lehnt ungültiges JSON ab", () => {
    expect(parseConsentJson("{")).toBeNull();
    expect(parseConsentJson(null)).toBeNull();
    expect(parseConsentJson("{}")).toBeNull();
  });
});

describe("buildConsentRecord & serializeConsent", () => {
  it("rundet Trip", () => {
    const r = buildConsentRecord({ statistics: false, marketing: false });
    expect(r.v).toBe(CONSENT_JSON_VERSION);
    const again = parseConsentJson(serializeConsent(r));
    expect(again).toEqual(r);
  });
});
