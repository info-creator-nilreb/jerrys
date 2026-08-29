import {
  CMS_LINK_TARGET_CUSTOM_VALUE,
  resolveCmsLinkTargetSelectValue,
} from "@/lib/content/cms-link-target-options";

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

/** @deprecated Alias — nutze `CMS_LINK_TARGET_CUSTOM_VALUE`. */
export const HERO_CTA_CUSTOM_VALUE = CMS_LINK_TARGET_CUSTOM_VALUE;

export function resolveHeroCtaSelectValue(href: string): string {
  return resolveCmsLinkTargetSelectValue(
    href,
    HERO_CTA_TARGET_PRESETS.map((p) => ({
      href: p.href,
      label: p.label,
      group: "system" as const,
    })),
  );
}
