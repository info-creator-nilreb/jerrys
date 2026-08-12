import { describe, expect, it } from "vitest";
import {
  humanizeAiProviderMessage,
  mapOpenAiHttpFailure,
} from "@/features/integrations";

describe("ai provider errors", () => {
  it("mappt insufficient_quota verständlich", () => {
    const result = mapOpenAiHttpFailure(429, {
      error: { code: "insufficient_quota", message: "You exceeded your current quota" },
    });
    expect(result.error).toBe("rate_limited");
    expect(result.message).toMatch(/Kontingent|Guthaben|Abrechnung/i);
  });

  it("mappt Rate-Limit ohne Quota", () => {
    const result = mapOpenAiHttpFailure(429, {
      error: { code: "rate_limit_exceeded", message: "Rate limit reached" },
    });
    expect(result.error).toBe("rate_limited");
    expect(result.message).toMatch(/Rate-Limit/i);
  });

  it("mappt ungültigen Key", () => {
    const result = mapOpenAiHttpFailure(401, {
      error: { code: "invalid_api_key", message: "Incorrect API key" },
    });
    expect(result.error).toBe("not_configured");
    expect(result.message).toMatch(/API-Key/i);
  });

  it("humanize belässt deutsche Tageslimit-Meldung", () => {
    const msg =
      "Tageslimit für KI-Anfragen erreicht (100/Tag, UTC). Limit unter Integrationen erhöhen oder morgen erneut versuchen.";
    expect(humanizeAiProviderMessage(msg)).toBe(msg);
  });
});
