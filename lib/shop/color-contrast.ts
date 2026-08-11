/** WCAG 2.2 relative luminance / contrast helpers for brand colors (Epic 11). */

const HEX_RRGGBB = /^#([0-9a-fA-F]{6})$/;

export function isHexColor(value: string): boolean {
  return HEX_RRGGBB.test(value.trim());
}

export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = HEX_RRGGBB.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance (WCAG), 0…1. */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two `#RRGGBB` colors (WCAG), or null if invalid. */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  if (l1 == null || l2 == null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastEvaluation = {
  ratio: number;
  /** AA normal text (≥ 4.5:1) */
  aaNormal: boolean;
  /** AA large text (≥ 3:1) */
  aaLarge: boolean;
  /** Non-text UI components / graphical objects (≥ 3:1) */
  aaUi: boolean;
};

export function evaluateContrast(foregroundHex: string, backgroundHex: string): ContrastEvaluation | null {
  const ratio = contrastRatio(foregroundHex, backgroundHex);
  if (ratio == null) return null;
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaUi: ratio >= 3,
  };
}

export type PrimaryBrandContrastReport = {
  whiteOnPrimary: ContrastEvaluation;
  primaryOnWhite: ContrastEvaluation;
  /** True if white-on-primary meets UI AA (button label) and primary-on-white meets large-text AA (links). */
  meetsRecommendedAa: boolean;
  warnings: string[];
};

/**
 * Bewertet Primärfarbe gegen Weiß (Buttons) und Weiß-Hintergrund (Links).
 * Slice 1: nur Warnungen — jerry’s-Grün bleibt migrationsfähig.
 */
export function evaluatePrimaryBrandContrast(primaryHex: string): PrimaryBrandContrastReport | null {
  const whiteOnPrimary = evaluateContrast("#ffffff", primaryHex);
  const primaryOnWhite = evaluateContrast(primaryHex, "#ffffff");
  if (!whiteOnPrimary || !primaryOnWhite) return null;

  const warnings: string[] = [];
  if (!whiteOnPrimary.aaUi) {
    warnings.push(
      `Weiß auf Primärfarbe (${primaryHex}) erreicht nur ${whiteOnPrimary.ratio.toFixed(2)}:1 (UI-AA erfordert 3:1).`,
    );
  }
  if (!primaryOnWhite.aaLarge) {
    warnings.push(
      `Primärfarbe auf Weiß (${primaryHex}) erreicht nur ${primaryOnWhite.ratio.toFixed(2)}:1 (Large-Text-AA erfordert 3:1).`,
    );
  }

  return {
    whiteOnPrimary,
    primaryOnWhite,
    meetsRecommendedAa: whiteOnPrimary.aaUi && primaryOnWhite.aaLarge,
    warnings,
  };
}
