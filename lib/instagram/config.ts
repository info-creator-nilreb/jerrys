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

export function isVercelPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/** Hostname für Meta „App-Domains“ (ohne Schema, ohne Pfad). */
export function getInstagramMetaAppDomain(redirectUri: string): string | null {
  try {
    return new URL(redirectUri).hostname;
  } catch {
    return null;
  }
}

/**
 * Stabile Origin für OAuth-Redirect (Meta App Domains).
 * Bewusst NICHT `VERCEL_URL` / Preview-`AUTH_URL` — die wechseln und stehen nicht in Meta.
 * Reihenfolge: INSTAGRAM_REDIRECT_URI → NEXT_PUBLIC_SITE_URL → AUTH_URL (nur Production).
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
  // Auf Preview setzt syncAuthUrlForVercelPreview() AUTH_URL auf den Deployment-Host.
  if (!isVercelPreviewDeployment()) {
    const auth = process.env.AUTH_URL?.trim().replace(/\/$/, "");
    if (auth) return auth;
  }
  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT ?? "3001";
    return `http://127.0.0.1:${port}`;
  }
  return "";
}

/** Admin-/Callback-Redirects — gleiche stabile Origin wie OAuth. */
export function getInstagramAdminSiteBase(): string {
  const origin = getInstagramOAuthOrigin().replace(/\/$/, "");
  if (origin) return origin;
  const port = process.env.PORT ?? "3001";
  return `http://127.0.0.1:${port}`;
}

export type InstagramOAuthReadiness = {
  ready: boolean;
  redirectUri: string | null;
  metaAppDomain: string | null;
  /** Admin-URL, über die OAuth gestartet werden muss. */
  connectAdminUrl: string | null;
  blockReason: string | null;
};

/** Prüft, ob OAuth von der aktuellen Request-Origin aus startbar ist. */
export function getInstagramOAuthReadiness(requestOrigin?: string | null): InstagramOAuthReadiness {
  const config = getInstagramAppConfig();
  if (!config) {
    return {
      ready: false,
      redirectUri: null,
      metaAppDomain: null,
      connectAdminUrl: null,
      blockReason:
        "Instagram App nicht konfiguriert (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, NEXT_PUBLIC_SITE_URL oder INSTAGRAM_REDIRECT_URI).",
    };
  }

  const metaAppDomain = getInstagramMetaAppDomain(config.redirectUri);
  const connectAdminUrl = `${config.redirectUri.replace(/\/api\/admin\/instagram\/callback\/?$/, "")}/admin/inhalte/marketing`;

  if (isVercelPreviewDeployment() && !process.env.INSTAGRAM_REDIRECT_URI?.trim() && !process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return {
      ready: false,
      redirectUri: config.redirectUri,
      metaAppDomain,
      connectAdminUrl,
      blockReason:
        "Auf Vercel-Preview fehlt NEXT_PUBLIC_SITE_URL oder INSTAGRAM_REDIRECT_URI (Production). OAuth nur über die Production-Admin-URL starten.",
    };
  }

  const normalizedRequest = requestOrigin?.trim().replace(/\/$/, "") ?? "";
  const redirectOrigin = new URL(config.redirectUri).origin;
  if (normalizedRequest && normalizedRequest !== redirectOrigin) {
    return {
      ready: false,
      redirectUri: config.redirectUri,
      metaAppDomain,
      connectAdminUrl,
      blockReason: `OAuth muss über dieselbe Domain starten wie die Redirect-URI. Bitte öffnen: ${connectAdminUrl}`,
    };
  }

  return {
    ready: true,
    redirectUri: config.redirectUri,
    metaAppDomain,
    connectAdminUrl,
    blockReason: null,
  };
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

export function getInstagramConfigDiagnostics(requestOrigin?: string | null): {
  configured: boolean;
  appIdMasked: string | null;
  redirectUri: string | null;
  metaAppDomain: string | null;
  connectAdminUrl: string | null;
  oauthReady: boolean;
  oauthBlockReason: string | null;
  authMode: InstagramAuthMode;
} {
  const authMode = getInstagramAuthMode();
  const readiness = getInstagramOAuthReadiness(requestOrigin);
  const config = getInstagramAppConfig();
  if (!config) {
    return {
      configured: false,
      appIdMasked: null,
      redirectUri: readiness.redirectUri,
      metaAppDomain: readiness.metaAppDomain,
      connectAdminUrl: readiness.connectAdminUrl,
      oauthReady: false,
      oauthBlockReason: readiness.blockReason,
      authMode,
    };
  }
  return {
    configured: true,
    appIdMasked: maskInstagramAppId(config.appId),
    redirectUri: config.redirectUri,
    metaAppDomain: readiness.metaAppDomain,
    connectAdminUrl: readiness.connectAdminUrl,
    oauthReady: readiness.ready,
    oauthBlockReason: readiness.blockReason,
    authMode,
  };
}
