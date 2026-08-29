/**
 * Öffentliche Shopify-Storefront (JSON-API) für Bild-Nachzug.
 * Edelweiss liegt noch auf Shopify (`edelweissdesigns.de`), der Next-Shop separat.
 */
export function resolveShopifyPublicOrigin(shopName?: string | null): string | null {
  const fromEnv = process.env.SHOPIFY_PUBLIC_ORIGIN?.trim();
  if (fromEnv) {
    try {
      const u = new URL(fromEnv.includes("://") ? fromEnv : `https://${fromEnv}`);
      if (u.protocol !== "https:") return null;
      return `${u.protocol}//${u.host}`;
    } catch {
      return null;
    }
  }
  const name = (shopName ?? "").trim().toLowerCase();
  if (name.includes("edelweiss") || name.includes("edel weiss")) {
    return "https://edelweissdesigns.de";
  }
  return null;
}
