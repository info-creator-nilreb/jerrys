/**
 * PayPal Zettle (private Integration, Assertion Grant).
 * OAuth: https://oauth.zettle.com
 * Products: https://products.izettle.com
 * Purchases: https://purchase.izettle.com
 */

export const ZETTLE_OAUTH_BASE_URL = "https://oauth.zettle.com";
export const ZETTLE_PRODUCT_API_BASE_URL = "https://products.izettle.com";
export const ZETTLE_PURCHASE_API_BASE_URL = "https://purchase.izettle.com";
export const ZETTLE_INVENTORY_API_BASE_URL = "https://inventory.izettle.com";
export const ZETTLE_PUSHER_API_BASE_URL = "https://pusher.izettle.com";

export const ZETTLE_CONNECTION_ID = "default" as const;

/** Empfohlene Scopes: Käufe + Katalog + Inventory-Balance (Discrepancy). */
export const ZETTLE_API_KEY_SCOPES = [
  "READ:PRODUCT",
  "WRITE:PRODUCT",
  "READ:PURCHASE",
] as const;

export function getZettleAttributionClientId(): string | null {
  const id = process.env.ZETTLE_CLIENT_ID?.trim();
  return id || null;
}

export function buildZettleApiKeyDeepLink(keyName = "jerry's Shop"): string {
  const scopes = ZETTLE_API_KEY_SCOPES.join("+");
  const name = encodeURIComponent(keyName);
  return `https://my.zettle.com/apps/api-keys?name=${name}&scopes=${scopes}`;
}

export function getZettleConfigDiagnostics(): {
  attributionClientIdMasked: string | null;
  apiKeyDeepLink: string;
} {
  const id = getZettleAttributionClientId();
  return {
    attributionClientIdMasked: id ? maskId(id) : null,
    apiKeyDeepLink: buildZettleApiKeyDeepLink(),
  };
}

function maskId(id: string): string {
  const t = id.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
