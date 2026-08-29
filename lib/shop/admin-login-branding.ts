import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";

function normalizePublicAssetUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  if (t.startsWith("/") || /^https:\/\//i.test(t)) return t;
  return null;
}

/**
 * Hero-Bild für Admin-Login/MFA — nur shop-eigene URLs, kein jerry's-Static-Fallback.
 * Reihenfolge: Admin-Login-Hero → OG/Titelbild (falls hochgeladen).
 */
export function resolveAdminLoginHeroImageUrl(
  settings: Pick<ShopSettingsDTO, "adminLoginHeroUrl" | "ogImageUrl">,
): string | null {
  return (
    normalizePublicAssetUrl(settings.adminLoginHeroUrl) ??
    normalizePublicAssetUrl(settings.ogImageUrl)
  );
}

/** Untertitel unter „Willkommen zurück.“ — Kurzbeschreibung oder Shopname. */
export function resolveAdminLoginTagline(
  settings: Pick<ShopSettingsDTO, "shopName" | "shortDescription">,
): string {
  const desc = settings.shortDescription?.trim();
  if (desc) return desc;
  return settings.shopName.trim() || JERRYS_SHOP_SETTINGS_DEFAULTS.shopName;
}

export function parseAdminLoginHeroUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  if (t === "") return null;
  if (t.startsWith("/")) return t.slice(0, 500);
  try {
    const u = new URL(t);
    if (u.protocol === "https:") return u.toString().slice(0, 500);
  } catch {
    return null;
  }
  return null;
}
