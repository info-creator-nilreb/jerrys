/**
 * Vorschläge für Hero-CTA-Zielseiten im Admin (interne Pfade).
 * Freier Pfad bleibt über „Eigener Pfad…“ möglich.
 */
export const HERO_CTA_TARGET_PRESETS = [
  { href: "/produkte", label: "Alle Produkte" },
  { href: "/kategorien", label: "Kategorien" },
  { href: "/kollektionen", label: "Kollektionen" },
  { href: "/termine", label: "Termine" },
] as const;

export const HERO_CTA_CUSTOM_VALUE = "__custom__" as const;

export function resolveHeroCtaSelectValue(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (HERO_CTA_TARGET_PRESETS.some((p) => p.href === trimmed)) {
    return trimmed;
  }
  return HERO_CTA_CUSTOM_VALUE;
}
