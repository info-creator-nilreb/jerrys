/** Abstand unter dem fixed Storefront-Header (wie /produkte). */
export const storefrontMainPagePaddingClass =
  "pt-24 pb-10 md:pt-28 md:pb-14";

/**
 * Reale Header-Höhe (Logo + vertikales Padding + Border).
 * Einmal setzen — Overlays, Auth-Shell und scroll-padding nutzen denselben Token.
 */
export const storefrontHeaderHeightCssVars =
  "[--storefront-header-height:3.75rem] sm:[--storefront-header-height:4rem] md:[--storefront-header-height:4.5rem]";

/**
 * Header inkl. Info-Banner-Zeile (~2rem) über der Logo-Zeile.
 */
export const storefrontHeaderHeightCssVarsWithInfoBanner =
  "[--storefront-header-height:5.75rem] sm:[--storefront-header-height:6rem] md:[--storefront-header-height:6.5rem]";

export function storefrontHeaderHeightVars(options: {
  infoBannerVisible: boolean;
}): string {
  return options.infoBannerVisible
    ? storefrontHeaderHeightCssVarsWithInfoBanner
    : storefrontHeaderHeightCssVars;
}
