import { getInstagramAuthMode, type InstagramAuthMode } from "@/lib/instagram/auth-mode";

export const INSTAGRAM_OAUTH_STATE_COOKIE = "jerrys_ig_oauth_state";
export const INSTAGRAM_CONNECTION_ID = "default";
export const INSTAGRAM_MEDIA_SYNC_LIMIT = 24;
export const INSTAGRAM_SCOPE = "instagram_business_basic";

export type InstagramAppConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

/**
 * Stabile Origin für OAuth-Redirect (Meta App Domains).
 * Bewusst NICHT `VERCEL_URL` / Preview-Hosts — die wechseln und stehen nicht in Meta.
 * Reihenfolge: INSTAGRAM_REDIRECT_URI → NEXT_PUBLIC_SITE_URL → AUTH_URL.
 */
export function getInstagramOAuthOrigin(): string {
  const redirect = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  if (redirect) {
    try {
      return new URL(redirect).origin;
    } catch {
      // fall through
    }
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) return site;
  const auth = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  if (auth) return auth;
  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT ?? "3001";
    return `http://127.0.0.1:${port}`;
  }
  return "";
}

export function getInstagramRedirectUri(): string {
  const override = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  if (override) return override.replace(/\/$/, "");
  const origin = getInstagramOAuthOrigin().replace(/\/$/, "");
  if (!origin) {
    throw new Error(
      "Keine stabile Site-URL für Instagram-Redirect (NEXT_PUBLIC_SITE_URL oder INSTAGRAM_REDIRECT_URI).",
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

/** Maskierte App-ID für Admin-Diagnose (kein Secret). */
export function maskInstagramAppId(appId: string): string {
  const id = appId.trim();
  if (id.length <= 8) return "••••";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function getInstagramConfigDiagnostics(): {
  configured: boolean;
  appIdMasked: string | null;
  redirectUri: string | null;
  authMode: InstagramAuthMode;
} {
  const authMode = getInstagramAuthMode();
  const config = getInstagramAppConfig();
  if (!config) {
    return {
      configured: false,
      appIdMasked: null,
      redirectUri: null,
      authMode,
    };
  }
  return {
    configured: true,
    appIdMasked: maskInstagramAppId(config.appId),
    redirectUri: config.redirectUri,
    authMode,
  };
}
