import { describe, expect, it } from "vitest";
import { estimateAiCostMicros, formatEstimatedCostUsd } from "@/features/integrations";

describe("ai usage estimate", () => {
  it("schätzt Bildgenerierung fest", () => {
    expect(estimateAiCostMicros({ capability: "image_generation" })).toBe(40_000);
  });

  it("schätzt Text über Tokens", () => {
    const micros = estimateAiCostMicros({
      capability: "text",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    // 0.15 + 0.60 = 0.75 USD → 750_000 micros
    expect(micros).toBe(750_000);
  });

  it("formatiert Kosten lesbar", () => {
    expect(formatEstimatedCostUsd(0)).toBe("≈ $0,00");
    expect(formatEstimatedCostUsd(40_000)).toContain("0.04");
  });
});
