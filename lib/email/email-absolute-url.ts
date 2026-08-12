import { publicSiteBaseUrl } from "@/lib/email/template-utils";

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

  let base = publicSiteBaseUrl().replace(/\/$/, "");
  if (!base) {
    base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  }
  if (!base) return null;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${path}`;
}
