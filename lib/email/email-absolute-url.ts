import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Optionaler Basis-Override (z. B. Request-Origin der Admin-Vorschau),
 * damit `/branding/…`-Icons vom aktuellen Deployment geladen werden —
 * nicht von AUTH_URL/Production ohne die neuen Assets.
 */
const emailAssetBaseStore = new AsyncLocalStorage<string>();

/** Öffentliche Shop-Domain, die nach außen kommuniziert wird (Mails, Kundenlinks). */
export const CANONICAL_PUBLIC_SHOP_ORIGIN = "https://jerry-s.com";

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

function isManagedBlobHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host.endsWith(".blob.vercel-storage.com") ||
    host.endsWith(".public.blob.vercel-storage.com") ||
    host === "memory.blob.local"
  );
}

/** Eigene Shop-Hosts inkl. alter Vercel-URLs — in Mails auf die kanonische Domain umschreiben. */
function isFirstPartyShopHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "jerry-s.com" || host === "www.jerry-s.com" || isVercelAppHost(host);
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

function usablePublicShopOrigin(raw: string | undefined): string | null {
  const origin = originFromEnvUrl(raw);
  if (!origin) return null;
  const host = new URL(origin).hostname;
  if (isVercelAppHost(host)) return null;
  return origin;
}

/**
 * Öffentliche Origin für Bilder und Kunden-Links in Transaktions-Mails.
 *
 * `NEXT_PUBLIC_SITE_URL` auf `*.vercel.app` (alte Preview-/Projekt-URL) wird ignoriert.
 * Fallback ist `https://jerry-s.com`.
 */
export function resolvedEmailAssetBase(): string {
  const fromStore = emailAssetBaseStore.getStore()?.replace(/\/$/, "");
  if (fromStore) return fromStore;

  const publicSite = usablePublicShopOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (publicSite) return publicSite;

  const auth = usablePublicShopOrigin(process.env.AUTH_URL);
  if (auth) return auth;

  return CANONICAL_PUBLIC_SHOP_ORIGIN;
}

/** Alias für Kunden-CTA-Links in Transaktions-Mails. */
export function emailPublicOrigin(): string {
  return resolvedEmailAssetBase();
}

function rewriteToEmailAssetBase(url: URL): string {
  const base = resolvedEmailAssetBase();
  return `${base}${url.pathname}${url.search}${url.hash}`;
}

/**
 * Absolute URLs für E-Mail-`<img>` und Links.
 *
 * - **Kein** `127.0.0.1`-Fallback (anders als `canonicalSiteOrigin`): Gmail lädt keine
 *   Bilder von localhost; relative `src` funktionieren in Clients nicht.
 * - Kanonische Kunden-Domain: `https://jerry-s.com` (`NEXT_PUBLIC_SITE_URL`).
 * - HTTPS-Blob-URLs (Logo aus Object Storage) bleiben unverändert.
 * - Absolute URLs auf jerry-s.com / `*.vercel.app` werden auf diese Domain umgeschrieben.
 */
export function absoluteUrlForEmail(pathOrUrl: string): string | null {
  const raw = pathOrUrl.trim();
  if (!raw) return null;

  if (raw.startsWith("https://") || raw.startsWith("http://")) {
    const href = raw.startsWith("http://") ? `https://${raw.slice("http://".length)}` : raw;
    try {
      const url = new URL(href);
      if (isManagedBlobHost(url.hostname)) return url.href;
      if (isFirstPartyShopHost(url.hostname)) return rewriteToEmailAssetBase(url);
      return url.href;
    } catch {
      return null;
    }
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
