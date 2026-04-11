/** HTML-Escaping für einfache Transaktions-Mails (kein HTML aus Nutzer-HTML). */
export function escapeHtmlForEmail(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Basis-URL für Links in E-Mails (Shop-Frontend). */
export function publicSiteBaseUrl(): string {
  const a = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (a) return a;
  const b = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  if (b) return b;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}
