/**
 * Content-Security-Policy für HTML-Dokumente (Epic 10).
 * - Nur bei NODE_ENV=production (nicht `next dev`), damit HMR/Webpack nicht blockiert werden.
 * - PayPal SDK (script/frame/connect), Supabase (connect), Next/React brauchen pragmatische Ausnahmen.
 */

const BASE_DIRECTIVES = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://www.paypal.com",
    "https://www.paypalobjects.com",
    "https://www.sandbox.paypal.com",
    "https://cdn.paypal.com",
  ].join(" "),
  ["style-src", "'self'", "'unsafe-inline'"].join(" "),
  ["img-src", "'self'", "data:", "blob:", "https:"].join(" "),
  ["font-src", "'self'", "data:"].join(" "),
  [
    "connect-src",
    "'self'",
    "https://www.paypal.com",
    "https://api.paypal.com",
    "https://api-m.paypal.com",
    "https://www.paypalobjects.com",
    "https://www.sandbox.paypal.com",
    "https://api.sandbox.paypal.com",
    "https://*.paypal.com",
    "https://*.paypalobjects.com",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ].join(" "),
  [
    "frame-src",
    "'self'",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
    "https://www.paypalobjects.com",
    "https://*.paypal.com",
    "https://*.paypalobjects.com",
  ].join(" "),
  ["worker-src", "'self'", "blob:"].join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  [
    "form-action",
    "'self'",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
    "https://*.paypal.com",
  ].join(" "),
] as const;

/** Für Tests und statische Prüfungen (ohne Env). */
export const CONTENT_SECURITY_POLICY_BASE = BASE_DIRECTIVES.join("; ");

/**
 * Liefert die CSP-Zeile oder leeren String (Development: kein Header).
 */
export function buildContentSecurityPolicy(): string {
  if (process.env.NODE_ENV !== "production") {
    return "";
  }
  let policy = CONTENT_SECURITY_POLICY_BASE;
  if (process.env.VERCEL === "1") {
    policy += "; upgrade-insecure-requests";
  }
  return policy;
}
