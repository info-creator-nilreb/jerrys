/**
 * Abstand unter dem fixed Storefront-Header.
 * Nutzt `--storefront-header-height` (am Header und an `main` gesetzt), damit
 * „Nav unter Logo“ automatisch mehr Padding bekommt.
 */
export const storefrontMainPagePaddingClass =
  "pt-[calc(var(--storefront-header-height,3.75rem)+2.25rem)] pb-10 md:pb-14";

/**
 * Reale Header-Höhe (Logo + vertikales Padding + Border).
 * Einmal setzen — Overlays, Auth-Shell und scroll-padding nutzen denselben Token.
 */
export const storefrontHeaderHeightCssVars =
  "[--storefront-header-height:3.75rem] sm:[--storefront-header-height:4rem] md:[--storefront-header-height:4.5rem]";

/**
 * Höherer Header, wenn die Desktop-Linkzeile unter dem Logo liegt
 * (Logo-Zeile unverändert mobil; ab md zusätzliche Nav-Zeile).
 */
export const storefrontHeaderHeightCssVarsNavUnder =
  "[--storefront-header-height:3.75rem] sm:[--storefront-header-height:4rem] md:[--storefront-header-height:6.75rem]";

export function storefrontHeaderHeightVarsForNav(options: {
  desktopMode: string;
  navPlacement: string;
}): string {
  const under =
    options.desktopMode === "inline" && options.navPlacement === "under";
  return under
    ? storefrontHeaderHeightCssVarsNavUnder
    : storefrontHeaderHeightCssVars;
}
