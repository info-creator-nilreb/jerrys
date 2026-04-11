import { publicSiteBaseUrl } from "@/lib/email/template-utils";

/**
 * Absolute Origin für Canonicals, Sitemap, JSON-LD und OG-Bilder.
 * In Development Fallback auf typischen Dev-Port (vgl. `npm run dev`).
 */
export function canonicalSiteOrigin(): string {
  const fromEnv = publicSiteBaseUrl();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT ?? "3001";
    return `http://127.0.0.1:${port}`;
  }
  return "";
}

/** Wandelt relative Shop-URLs (`/media/...`) in absolute URLs um. */
export function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const origin = canonicalSiteOrigin();
  if (!origin) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin.replace(/\/$/, "")}${path}`;
}
