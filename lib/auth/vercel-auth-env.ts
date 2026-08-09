/**
 * Vercel Preview: oft ist AUTH_URL auf Production gesetzt — Auth.js CSRF/Callbacks
 * nutzen dann die falsche Origin (MissingCSRF / Login schlägt fehl).
 *
 * Nur `AUTH_URL` wird angepasst: `NEXT_PUBLIC_*` ersetzt Next.js zur Build-Zeit durch
 * Literale, eine Zuweisung wäre ungültiges JavaScript. Für Links genügt `AUTH_URL`,
 * weil `publicSiteBaseUrl()` es vor `NEXT_PUBLIC_SITE_URL` auswertet.
 */
export function syncAuthUrlForVercelPreview(): void {
  if (process.env.VERCEL_ENV !== "preview") return;

  const rawHost = process.env.VERCEL_URL?.trim();
  if (!rawHost) return;

  const host = rawHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const deploymentOrigin = `https://${host}`;

  const current = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  if (current !== deploymentOrigin) {
    process.env.AUTH_URL = deploymentOrigin;
  }
}
