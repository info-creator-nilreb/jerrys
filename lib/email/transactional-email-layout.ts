import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

/**
 * Transaktions-Mails: Akzentgrün nur für CTA, Hero-Icons und Tabellenlinien (`globals.css` --primary / --accent-green).
 * Hauptkarte: weiß; Footer: dunkler Kontrastblock wie Storefront-Footer.
 */
export const TRANSACTIONAL_EMAIL_DESIGN = {
  primary: "#8bbe25",
  primaryStrong: "#4c864d",
  /** Tabellen- / Summen-Trennlinien (Akzent) */
  divider: "#cfe9b0",
  /** Helles neutrales Seitenfeld hinter der Karte */
  pageBg: "#eceef1",
  text: "#333333",
  textMuted: "#5c5c5c",
  /** Info-Karten: weiß, neutraler Rand */
  cardBorderNeutral: "#e5e7eb",
  maxWidth: 600,
  /** Storefront-Navy für E-Mail-Footer */
  footerBg: "#182d4d",
  footerText: "#e5e7eb",
  footerTextMuted: "#9ca3af",
  footerDivider: "rgba(255,255,255,0.18)",
} as const;

/** Instagram laut Vorgabe (nur dieser Link in transaktionalen Mails). */
const TRANSACTIONAL_EMAIL_INSTAGRAM_URL = "https://www.instagram.com/jerrys.design/";

export type TransactionalHeroVariant = "order" | "shipping" | "refund";

export function transactionalPaymentLabel(method: string): string {
  switch (method) {
    case "vorkasse":
      return "Vorkasse";
    case "paypal":
      return "PayPal";
    case "klarna":
      return "Klarna";
    default:
      return method;
  }
}

function absUrl(path: string): string {
  const base = publicSiteBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** Shop-Wordmark für E-Mails (`NEXT_PUBLIC_SITE_URL` o. Ä. für absolute `src` nötig). */
function transactionalEmailLogoUrl(): string {
  return absUrl("/branding/jerrys-wordmark.jpg");
}

/** Hero-Kreis: neutral helles Grau (kein Grünflächen-Tint). */
function heroCircleBg(): string {
  return "#f3f4f6";
}

/**
 * Hero-Icons: Pfade wie in `lucide-react` v0.544 (ShoppingCart, Truck, Banknote),
 * Strichfarbe Akzentgrün.
 */
function heroIconSvg(variant: TransactionalHeroVariant): string {
  const stroke = TRANSACTIONAL_EMAIL_DESIGN.primaryStrong;
  const g = `stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  switch (variant) {
    case "order":
      return `<svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g ${g}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></g></svg>`;
    case "shipping":
      return `<svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g ${g}><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></g></svg>`;
    case "refund":
      return `<svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g ${g}><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></g></svg>`;
    default:
      return "";
  }
}

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtmlForEmail(href);
  const safeLabel = escapeHtmlForEmail(label);
  const { primary, primaryStrong } = TRANSACTIONAL_EMAIL_DESIGN;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px"><tr><td align="center" bgcolor="${primary}" style="border-radius:8px;border:2px solid ${primaryStrong}"><a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px">${safeLabel}</a></td></tr></table>`;
}

function footerLegalLink(href: string, label: string): string {
  const { footerText } = TRANSACTIONAL_EMAIL_DESIGN;
  return `<a href="${escapeHtmlForEmail(href)}" style="color:${footerText};font-weight:600;text-decoration:underline">${escapeHtmlForEmail(label)}</a>`;
}

function footerSocialRow(): string {
  const { primary } = TRANSACTIONAL_EMAIL_DESIGN;
  const url = TRANSACTIONAL_EMAIL_INSTAGRAM_URL;
  const igIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="${primary}" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="${primary}" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="${primary}"/></svg>`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px auto 0"><tr><td align="center" style="padding:0 10px"><a href="${escapeHtmlForEmail(url)}" style="text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:${primary}" aria-label="jerry's auf Instagram"><table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto"><tr><td style="vertical-align:middle;line-height:0;padding-right:8px">${igIcon}</td><td style="vertical-align:middle;color:${primary}">Instagram</td></tr></table></a></td></tr></table>`;
}

function footerUspRow(): string {
  const { primary, footerDivider, footerText, footerTextMuted } = TRANSACTIONAL_EMAIL_DESIGN;
  const g = `stroke="${primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const lock = `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle" aria-hidden="true"><g ${g}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></g></svg>`;
  const truck = `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle" aria-hidden="true"><g ${g}><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></g></svg>`;
  const mail = `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle" aria-hidden="true"><g ${g}><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></g></svg>`;
  const item = (icon: string, title: string) =>
    `<td style="padding:12px 8px;text-align:center;vertical-align:top;width:33%"><div style="margin-bottom:8px">${icon}</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;color:${footerText};line-height:1.4">${escapeHtmlForEmail(title)}</div></td>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-top:1px solid ${footerDivider}"><tr>${item(lock, "Sicher bezahlen")}${item(truck, "Schneller Versand")}${item(mail, "Kundenservice")}</tr></table>`;
}

function emailFooterBlock(): string {
  const impressum = absUrl("/impressum");
  const datenschutz = absUrl("/datenschutz");
  const social = footerSocialRow();
  const { footerBg, footerText, footerTextMuted, maxWidth } = TRANSACTIONAL_EMAIL_DESIGN;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${maxWidth}px;margin:0 auto;background:${footerBg}"><tr><td style="padding:24px 22px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${footerTextMuted};line-height:1.65;text-align:center">${footerUspRow()}${social}<p style="margin:20px 0 8px;color:${footerText}">jerry&apos;s · Dr. Alexander Berlin (e.U.) · Stargarder Str. 16 · 10437 Berlin</p><p style="margin:0">${footerLegalLink(impressum, "Impressum")} · ${footerLegalLink(datenschutz, "Datenschutz")}</p><p style="margin:16px 0 0;font-size:11px;color:${footerTextMuted}">Diese E-Mail wurde automatisch erstellt. Bitte antworte nicht direkt auf diese Nachricht.</p></td></tr></table>`;
}

export type TransactionalEmailWrapParams = {
  variant: TransactionalHeroVariant;
  documentTitle: string;
  heading: string;
  intro: string;
  /** Hauptinhalt: Karten, Tabellen, rein HTML, bereits escapet wo nötig. */
  bodyHtml: string;
  cta: { href: string; label: string };
};

/**
 * Tabellenbasiertes Grundgerüst (max. 600px): weiße Karte, grüne Akzente nur bei Icon/Button/Linien.
 */
export function wrapTransactionalEmailHtml(p: TransactionalEmailWrapParams): string {
  const { text, pageBg, maxWidth, cardBorderNeutral } = TRANSACTIONAL_EMAIL_DESIGN;
  const circleBg = heroCircleBg();
  const icon = heroIconSvg(p.variant);
  const logoSrc = escapeHtmlForEmail(transactionalEmailLogoUrl());
  const logoBlock = `<tr><td align="center" style="padding:0 0 22px"><a href="${escapeHtmlForEmail(absUrl("/"))}" style="text-decoration:none;display:inline-block"><img src="${logoSrc}" alt="jerry's" width="200" border="0" style="display:block;margin:0 auto;max-width:220px;height:auto;border:0;outline:none"/></a></td></tr>`;
  const mainCard = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${maxWidth}px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${cardBorderNeutral}"><tr><td style="padding:32px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:${text};background-color:#ffffff"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${logoBlock}<tr><td align="center" style="padding:4px 0 22px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" valign="middle" style="width:84px;height:84px;border-radius:50%;background:${circleBg};border:1px solid ${cardBorderNeutral};line-height:0;padding:16px">${icon}</td></tr></table></td></tr><tr><td style="font-size:22px;font-weight:700;color:#1f2937;line-height:1.35;text-align:center;padding-bottom:12px">${escapeHtmlForEmail(p.heading)}</td></tr><tr><td style="font-size:15px;line-height:1.55;color:${text};text-align:center;padding:0 4px 24px">${escapeHtmlForEmail(p.intro)}</td></tr><tr><td>${p.bodyHtml}</td></tr><tr><td align="center">${ctaButton(p.cta.href, p.cta.label)}</td></tr></table></td></tr></table>`;

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="x-ua-compatible" content="ie=edge"/><title>${escapeHtmlForEmail(p.documentTitle)}</title></head><body style="margin:0;padding:0;background:${pageBg}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${pageBg}"><tr><td align="center" style="padding:24px 12px">${mainCard}</td></tr><tr><td align="center" style="padding:0 12px 24px">${emailFooterBlock()}</td></tr></table></body></html>`;
}

export function grayInfoCard(innerHtml: string): string {
  const { cardBorderNeutral, text } = TRANSACTIONAL_EMAIL_DESIGN;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px"><tr><td style="background:#ffffff;border-radius:8px;border:1px solid ${cardBorderNeutral};padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${text}">${innerHtml}</td></tr></table>`;
}

export function tintedCard(background: string, innerHtml: string): string {
  const { cardBorderNeutral, text } = TRANSACTIONAL_EMAIL_DESIGN;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px"><tr><td style="background:${background};border-radius:8px;border:1px solid ${cardBorderNeutral};padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${text}">${innerHtml}</td></tr></table>`;
}

export type OrderLineItemForEmail = {
  productTitleSnapshot: string;
  quantity: number;
  lineTotalGrossCents: number;
  currency: string;
  /** Absolute Bild-URL für E-Mail-Clients (z. B. über `absoluteUrl` aus dem Shop). */
  coverImageAbsoluteUrl?: string | null;
  coverImageAlt?: string | null;
};

export function buildOrderItemsTableHtml(
  items: OrderLineItemForEmail[],
  formatPrice: (cents: number, currency: string) => string,
): string {
  const rows = items
    .map((i) => {
      const title = escapeHtmlForEmail(i.productTitleSnapshot);
      const qty = escapeHtmlForEmail(String(i.quantity));
      const price = escapeHtmlForEmail(formatPrice(i.lineTotalGrossCents, i.currency));
      const { divider, text: tcol, textMuted: muted, cardBorderNeutral } = TRANSACTIONAL_EMAIL_DESIGN;
      const placeholder = "#f3f4f6";
      const alt = escapeHtmlForEmail(i.coverImageAlt?.trim() || i.productTitleSnapshot);
      const thumb =
        i.coverImageAbsoluteUrl?.trim() ?
          `<img src="${escapeHtmlForEmail(i.coverImageAbsoluteUrl.trim())}" alt="${alt}" width="52" height="52" border="0" style="display:block;width:52px;height:52px;border-radius:6px;object-fit:cover;border:1px solid ${cardBorderNeutral};line-height:0" />`
        : `<div style="width:52px;height:52px;border-radius:6px;background:${placeholder};border:1px solid ${cardBorderNeutral};font-size:10px;color:#9ca3af;text-align:center;line-height:52px">IMG</div>`;
      return `<tr><td style="padding:12px 0;border-bottom:1px solid ${divider};width:56px;vertical-align:middle;line-height:0">${thumb}</td><td style="padding:12px 0 12px 14px;border-bottom:1px solid ${divider};vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${tcol}"><strong style="color:#1f2937">${title}</strong><br/><span style="font-size:13px;color:${muted}">Menge: ${qty}</span></td><td style="padding:12px 0;border-bottom:1px solid ${divider};text-align:right;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1f2937;white-space:nowrap">${price}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 16px">${rows}</table>`;
}

export function formatGermanDateMedium(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
