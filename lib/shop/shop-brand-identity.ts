/** Erkennung des Edel-weiss-Shops anhand des konfigurierten Shopnamens. */
export function isEdelweissShopName(shopName?: string | null): boolean {
  const name = (shopName ?? "").trim().toLowerCase();
  return name.includes("edelweiss") || name.includes("edel weiss");
}
