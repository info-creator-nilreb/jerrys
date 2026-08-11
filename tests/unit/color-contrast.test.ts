import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  evaluatePrimaryBrandContrast,
  isHexColor,
  relativeLuminance,
} from "@/lib/shop/color-contrast";

describe("color-contrast", () => {
  it("erkennt gültige Hex-Farben", () => {
    expect(isHexColor("#8bbe25")).toBe(true);
    expect(isHexColor("#000000")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
  });

  it("berechnet Kontrast Schwarz/Weiß korrekt", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("warnt bei jerry’s-Primärgrün (bekanntes Baseline-Branding)", () => {
    const report = evaluatePrimaryBrandContrast("#8bbe25");
    expect(report).not.toBeNull();
    expect(report!.whiteOnPrimary.ratio).toBeLessThan(3);
    expect(report!.meetsRecommendedAa).toBe(false);
    expect(report!.warnings.length).toBeGreaterThan(0);
  });

  it("akzeptiert ausreichend dunkles Grün für UI-AA", () => {
    const report = evaluatePrimaryBrandContrast("#2f6a1f");
    expect(report).not.toBeNull();
    expect(report!.whiteOnPrimary.aaUi).toBe(true);
  });
});
