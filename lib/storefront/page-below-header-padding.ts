/**
 * Abstand unter dem fixed Storefront-Header.
 * Nutzt `--storefront-header-height` (am Header und an `main` gesetzt), damit
 * „Nav unter Logo“ / Info-Banner automatisch mehr Padding bekommen.
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

/** Header inkl. Info-Banner-Zeile (~2rem) über der Logo-Zeile. */
export const storefrontHeaderHeightCssVarsWithInfoBanner =
  "[--storefront-header-height:5.75rem] sm:[--storefront-header-height:6rem] md:[--storefront-header-height:6.5rem]";

/** Info-Banner + Desktop-Nav unter dem Logo. */
export const storefrontHeaderHeightCssVarsWithInfoBannerNavUnder =
  "[--storefront-header-height:5.75rem] sm:[--storefront-header-height:6rem] md:[--storefront-header-height:8.75rem]";

export function storefrontHeaderHeightVarsForNav(options: {
  desktopMode: string;
  navPlacement: string;
  infoBannerVisible?: boolean;
}): string {
  const under =
    options.desktopMode === "inline" && options.navPlacement === "under";
  const banner = Boolean(options.infoBannerVisible);
  if (banner && under) return storefrontHeaderHeightCssVarsWithInfoBannerNavUnder;
  if (banner) return storefrontHeaderHeightCssVarsWithInfoBanner;
  if (under) return storefrontHeaderHeightCssVarsNavUnder;
  return storefrontHeaderHeightCssVars;
}

/** @deprecated Alias — nutze `storefrontHeaderHeightVarsForNav`. */
export function storefrontHeaderHeightVars(options: {
  infoBannerVisible: boolean;
  desktopMode?: string;
  navPlacement?: string;
}): string {
  return storefrontHeaderHeightVarsForNav({
    desktopMode: options.desktopMode ?? "inline",
    navPlacement: options.navPlacement ?? "beside",
    infoBannerVisible: options.infoBannerVisible,
  });
}
