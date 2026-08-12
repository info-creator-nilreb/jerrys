import { AsyncLocalStorage } from "node:async_hooks";
import { publicSiteBaseUrl } from "@/lib/email/template-utils";

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

function resolvedEmailAssetBase(): string {
  const fromStore = emailAssetBaseStore.getStore()?.replace(/\/$/, "");
  if (fromStore) return fromStore;
  let base = publicSiteBaseUrl().replace(/\/$/, "");
  if (!base) {
    base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  }
  return base;
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
