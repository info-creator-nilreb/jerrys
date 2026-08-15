/** HTML-Escaping für einfache Transaktions-Mails (kein HTML aus Nutzer-HTML). */
export function escapeHtmlForEmail(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Basis-URL für Auth.js und interne App-Links (AUTH_URL zuerst, dann VERCEL_URL).
 * Kunden-Mails nutzen `resolvedEmailAssetBase()` — sonst gewinnen Preview-Hosts. */
export function publicSiteBaseUrl(): string {
  // Laufzeit-Variablen zuerst (Vercel Server Actions), dann Build-Zeit Public-URL.
  const auth = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  if (auth) return auth;
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (host) return `https://${host}`;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) return site;
  return "";
}
