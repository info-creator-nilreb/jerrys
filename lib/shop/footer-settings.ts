/**
 * Footer-Zusammensetzung (ShopSettings).
 * Rechtliches: Impressum + Datenschutz bleiben immer sichtbar (DE-Compliance).
 */

export const FOOTER_OPTIONAL_LEGAL_KEYS = [
  "agb",
  "widerruf",
  "rueckgabe",
  "versand",
] as const;

export type FooterOptionalLegalKey = (typeof FOOTER_OPTIONAL_LEGAL_KEYS)[number];

export type FooterLegalLink = {
  href: `/${string}`;
  label: string;
  key: "impressum" | "datenschutz" | FooterOptionalLegalKey;
};

const OPTIONAL_LEGAL_DEFS: Record<
  FooterOptionalLegalKey,
  { href: `/${FooterOptionalLegalKey}`; label: string }
> = {
  agb: { href: "/agb", label: "AGB" },
  widerruf: { href: "/widerruf", label: "Widerruf" },
  rueckgabe: { href: "/rueckgabe", label: "Rückgabe" },
  versand: { href: "/versand", label: "Versand" },
};

export type FooterVisibilitySettings = {
  footerShowTagline: boolean;
  footerShowShopNav: boolean;
  footerShowCollections: boolean;
  footerShowCmsLinks: boolean;
  footerShowSocial: boolean;
  footerShowLegalAgb: boolean;
  footerShowLegalWiderruf: boolean;
  footerShowLegalRueckgabe: boolean;
  footerShowLegalVersand: boolean;
};

/** Impressum + Datenschutz immer; optionale Legal-Links nach Settings. */
export function resolveFooterLegalLinks(
  settings: FooterVisibilitySettings,
): FooterLegalLink[] {
  const links: FooterLegalLink[] = [
    { key: "impressum", href: "/impressum", label: "Impressum" },
    { key: "datenschutz", href: "/datenschutz", label: "Datenschutz" },
  ];

  const optionalOn: Record<FooterOptionalLegalKey, boolean> = {
    agb: settings.footerShowLegalAgb,
    widerruf: settings.footerShowLegalWiderruf,
    rueckgabe: settings.footerShowLegalRueckgabe,
    versand: settings.footerShowLegalVersand,
  };

  for (const key of FOOTER_OPTIONAL_LEGAL_KEYS) {
    if (!optionalOn[key]) continue;
    const def = OPTIONAL_LEGAL_DEFS[key];
    links.push({ key, href: def.href, label: def.label });
  }

  return links;
}
