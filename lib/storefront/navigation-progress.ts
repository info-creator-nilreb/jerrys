export function isInternalStorefrontNavigationHref(
  href: string,
  origin: string,
  options?: { target?: string | null; download?: boolean },
): boolean {
  if (options?.target === "_blank" || options?.download) return false;
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return false;
  }

  return url.origin === origin;
}

export function storefrontNavigationTarget(href: string, origin: string): string | null {
  if (!href) return null;

  try {
    const url = new URL(href, origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
