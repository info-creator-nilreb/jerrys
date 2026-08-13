import { getShopSettings } from "@/lib/shop/shop-settings";

/**
 * Shop-Feature-Flag „Termine“ (`ShopSettings.showTermineInNav`).
 * Steuert Sichtbarkeit in Storefront-Nav/Footer, Admin-Nav und öffentliche Termin-Routen.
 * Kundenkonto-Nav: zusätzlich erst nach mindestens einer Buchung (separat prüfen).
 */
export async function isTermineFeatureEnabled(): Promise<boolean> {
  const settings = await getShopSettings();
  return settings.showTermineInNav;
}
