import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

export const INSTAGRAM_OAUTH_STATE_COOKIE = "jerrys_ig_oauth_state";
export const INSTAGRAM_CONNECTION_ID = "default";
export const INSTAGRAM_MEDIA_SYNC_LIMIT = 24;
export const INSTAGRAM_SCOPE = "instagram_business_basic";

export type InstagramAppConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

export function getInstagramRedirectUri(): string {
  const override = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  if (override) return override.replace(/\/$/, "");
  const origin = canonicalSiteOrigin().replace(/\/$/, "");
  if (!origin) {
    throw new Error(
      "Keine Site-URL für Instagram-Redirect (NEXT_PUBLIC_SITE_URL / AUTH_URL).",
    );
  }
  return `${origin}/api/admin/instagram/callback`;
}

export function getInstagramAppConfig(): InstagramAppConfig | null {
  const appId = process.env.INSTAGRAM_APP_ID?.trim() ?? "";
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim() ?? "";
  if (!appId || !appSecret) return null;
  try {
    return { appId, appSecret, redirectUri: getInstagramRedirectUri() };
  } catch {
    return null;
  }
}

export function isInstagramAppConfigured(): boolean {
  return getInstagramAppConfig() !== null;
}
