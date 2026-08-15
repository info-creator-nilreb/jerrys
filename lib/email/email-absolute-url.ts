import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Optionaler Basis-Override (z. B. Request-Origin der Admin-Vorschau),
 * damit `/branding/…`-Icons vom aktuellen Deployment geladen werden —
 * nicht von AUTH_URL/Production ohne die neuen Assets.
 */
const emailAssetBaseStore = new AsyncLocalStorage<string>();

export function runWithEmailAssetBaseUrl<T>(baseUrl: string, fn: () => T): T {
  const normalized = baseUrl.trim().replace(/\/$/, "");
  if (!normalized) return fn();
  return emailAssetBaseStore.run(normalized, fn);
}

export async function runWithEmailAssetBaseUrlAsync<T>(
  baseUrl: string,
  fn: () => Promise<T>,
): Promise<T> {
  const normalized = baseUrl.trim().replace(/\/$/, "");
  if (!normalized) return fn();
  return emailAssetBaseStore.run(normalized, fn);
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

function isVercelAppHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith(".vercel.app");
}

function originFromEnvUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const origin = new URL(withScheme).origin;
    if (isLoopbackHost(new URL(origin).hostname)) return null;
    return origin;
  } catch {
    return null;
  }
}

/**
 * Öffentliche Origin für Bilder und Kunden-Links in Transaktions-Mails.
 *
 * `publicSiteBaseUrl()` bevorzugt AUTH_URL, dann VERCEL_URL — auf Vercel ist
 * `VERCEL_URL` immer `*.vercel.app` (oft Deployment Protection). Gmail kann
 * diese Bilder nicht laden. Deshalb: `NEXT_PUBLIC_SITE_URL` zuerst.
 * AUTH_URL bleibt AUTH_URL-first für Auth.js / Preview-Login.
 */
export function resolvedEmailAssetBase(): string {
  const fromStore = emailAssetBaseStore.getStore()?.replace(/\/$/, "");
  if (fromStore) return fromStore;

  const publicSite = originFromEnvUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (publicSite) return publicSite;

  const auth = originFromEnvUrl(process.env.AUTH_URL);
  if (auth && !isVercelAppHost(new URL(auth).hostname)) return auth;

  const vercel = originFromEnvUrl(process.env.VERCEL_URL);
  if (vercel && !isVercelAppHost(new URL(vercel).hostname)) return vercel;

  // Letzter Ausweg (Preview ohne Site-URL): Deployment-Host, auch *.vercel.app.
  if (auth) return auth;
  if (vercel) return vercel;
  return "";
}

/** Alias für Kunden-CTA-Links in Transaktions-Mails. */
export function emailPublicOrigin(): string {
  return resolvedEmailAssetBase();
}

/**
 * Absolute URLs für E-Mail-`<img>` und Links.
 *
 * - **Kein** `127.0.0.1`-Fallback (anders als `canonicalSiteOrigin`): Gmail lädt keine
 *   Bilder von localhost; relative `src` funktionieren in Clients nicht.
 * - Setze in Production `NEXT_PUBLIC_SITE_URL` (https://www.deine-domain.de).
 * - HTTPS-Blob-URLs (z. B. Logo aus Einstellungen) werden unverändert durchgereicht.
 */
export function absoluteUrlForEmail(pathOrUrl: string): string | null {
  const raw = pathOrUrl.trim();
  if (!raw) return null;
  if (raw.startsWith("https://")) return raw;
  if (raw.startsWith("http://")) {
    // E-Mail-Clients blocken Mixed Content oft — auf https anheben.
    return `https://${raw.slice("http://".length)}`;
  }

  const base = resolvedEmailAssetBase();
  if (!base) return null;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${path}`;
}

/** CTA-/Href in Mails: absolute URL oder relativer Fallback. */
export function emailAbsoluteHref(path: string): string {
  return absoluteUrlForEmail(path) ?? (path.startsWith("/") ? path : `/${path}`);
}
