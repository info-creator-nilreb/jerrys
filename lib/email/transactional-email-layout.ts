import "server-only";

import { absoluteUrlForEmail } from "@/lib/email/email-absolute-url";
import {
  absoluteEmailIconUrl,
  footerIconPublicPath,
  heroIconPublicPath,
  type TransactionalHeroVariant,
} from "@/lib/email/email-icon-assets";
import { escapeHtmlForEmail } from "@/lib/email/template-utils";
import { formatGermanDateMedium } from "@/lib/i18n/format-german-date";
import { paymentMethodLabel } from "@/lib/orders/payment-method-label";
import {
  defaultTransactionalEmailBranding,
  type TransactionalEmailBranding,
} from "@/lib/shop/email-branding";

export { formatGermanDateMedium };
export type { TransactionalHeroVariant };
export const transactionalPaymentLabel = paymentMethodLabel;

/**
 * Transaktions-Mails: Akzentgrün nur für CTA, Hero-Icons und Tabellenlinien (`globals.css` --primary / --accent-green).
 * Hauptkarte: weiß; Footer: dunkler Kontrastblock wie Storefront-Footer.
 * Primärfarbe kann pro Aufruf aus ShopSettings überschrieben werden.
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

/** Links in Mails müssen absolut sein; ohne konfigurierte Basis nur Platzhalter. */
function absUrl(path: string): string {
  return absoluteUrlForEmail(path) ?? "#";
}

function brandingOrDefault(
  branding?: TransactionalEmailBranding,
): TransactionalEmailBranding {
  return branding ?? defaultTransactionalEmailBranding();
}

/**
 * Logo aus Shop-Einstellungen als `<img>` mit absoluter HTTPS-URL
 * (Gmail/Outlook laden keine relativen/localhost-Bilder).
 * Fallback: Textmarke, wenn keine auflösbare URL.
 */
export function transactionalLogoBlock(branding: TransactionalEmailBranding): string {
  const home = absUrl("/");
  const shopName = escapeHtmlForEmail(branding.shopName);
  const logoUrl = branding.logoAbsoluteUrl?.trim() || null;
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    const safeSrc = escapeHtmlForEmail(logoUrl);
    // width-Attribut + display:block: Outlook/Gmail-kompatibel; max-width für Mobile.
    return `<tr><td align="center" style="padding:0 0 22px"><a href="${escapeHtmlForEmail(home)}" style="text-decoration:none;display:inline-block;border:0;outline:none" target="_blank"><img src="${safeSrc}" alt="${shopName}" width="200" border="0" style="display:block;margin:0 auto;width:200px;max-width:220px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic"/></a></td></tr>`;
  }
  return `<tr><td align="center" style="padding:0 0 22px"><a href="${escapeHtmlForEmail(home)}" style="text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1f2937">${shopName}</a></td></tr>`;
}

/** Hero-Kreis: neutral helles Grau (kein Grünflächen-Tint). */
function heroCircleBg(): string {
  return "#f3f4f6";
}

/**
 * Schlanke Lucide-ähnliche PNG-Icons (keine Emoji, kein Inline-SVG — Gmail strippt SVG).
 * Quelle: `/branding/email-icons/*.png`, absolut über Site-URL.
 */
export function heroIconHtml(variant: TransactionalHeroVariant): string {
  const url = absoluteEmailIconUrl(heroIconPublicPath(variant));
  if (!url) {
    return `<span style="font-size:14px;line-height:1;color:#6b7280;font-family:Arial,Helvetica,sans-serif" aria-hidden="true">●</span>`;
  }
  const alt =
    variant === "order"
      ? "Bestellung"
      : variant === "shipping"
        ? "Versand"
        : variant === "refund"
          ? "Erstattung"
          : variant === "account"
            ? "Konto"
            : "Termin";
  return `<img src="${escapeHtmlForEmail(url)}" alt="${escapeHtmlForEmail(alt)}" width="40" height="40" border="0" style="display:block;width:40px;height:40px;border:0;outline:none;-ms-interpolation-mode:bicubic" />`;
}

function footerIconImg(kind: "lock" | "truck" | "mail" | "instagram", alt: string): string {
  const url = absoluteEmailIconUrl(footerIconPublicPath(kind));
  if (!url) {
    return `<span style="font-size:14px;line-height:1;color:#e5e7eb" aria-hidden="true">●</span>`;
  }
  return `<img src="${escapeHtmlForEmail(url)}" alt="${escapeHtmlForEmail(alt)}" width="22" height="22" border="0" style="display:inline-block;width:22px;height:22px;border:0;outline:none;vertical-align:middle;-ms-interpolation-mode:bicubic" />`;
}

export function transactionalCtaButton(
  href: string,
  label: string,
  branding: TransactionalEmailBranding,
): string {
  const safeHref = escapeHtmlForEmail(href);
  const safeLabel = escapeHtmlForEmail(label);
  const primary = branding.primary;
  const primaryStrong = branding.primaryStrong;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto"><tr><td align="center"><a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;background-color:${primary};border:2px solid ${primaryStrong};border-radius:8px;line-height:1.2">${safeLabel}</a></td></tr></table>`;
}

function footerLegalLink(href: string, label: string): string {
  const { footerText } = TRANSACTIONAL_EMAIL_DESIGN;
  return `<a href="${escapeHtmlForEmail(href)}" style="color:${footerText};font-weight:600;text-decoration:underline">${escapeHtmlForEmail(label)}</a>`;
}

function footerSocialRow(branding: TransactionalEmailBranding): string {
  const url = branding.instagramUrl?.trim();
  if (!url) return "";
  const { footerText } = TRANSACTIONAL_EMAIL_DESIGN;
  const aria = escapeHtmlForEmail(`${branding.shopName} auf Instagram`);
  const igMark = footerIconImg("instagram", "Instagram");
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px auto 0"><tr><td align="center" style="padding:0 10px"><a href="${escapeHtmlForEmail(url)}" style="text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:${footerText}" aria-label="${aria}"><table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto"><tr><td style="vertical-align:middle;line-height:0;padding-right:8px">${igMark}</td><td style="vertical-align:middle;color:${footerText}">Instagram</td></tr></table></a></td></tr></table>`;
}

function footerUspRow(): string {
  const { footerDivider, footerText } = TRANSACTIONAL_EMAIL_DESIGN;
  const item = (icon: string, title: string) =>
    `<td style="padding:12px 8px;text-align:center;vertical-align:top;width:33%"><div style="margin-bottom:8px;line-height:0">${icon}</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;color:${footerText};line-height:1.4">${escapeHtmlForEmail(title)}</div></td>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-top:1px solid ${footerDivider}"><tr>${item(footerIconImg("lock", "Sicher bezahlen"), "Sicher bezahlen")}${item(footerIconImg("truck", "Schneller Versand"), "Schneller Versand")}${item(footerIconImg("mail", "Kundenservice"), "Kundenservice")}</tr></table>`;
}

export function transactionalEmailFooterBlock(branding: TransactionalEmailBranding): string {
  const impressum = absUrl("/impressum");
  const datenschutz = absUrl("/datenschutz");
  const social = footerSocialRow(branding);
  const identity = escapeHtmlForEmail(branding.footerIdentityLine);
  const { footerBg, footerText, footerTextMuted, maxWidth } = TRANSACTIONAL_EMAIL_DESIGN;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${maxWidth}px;margin:0 auto;background:${footerBg}"><tr><td style="padding:24px 22px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${footerTextMuted};line-height:1.65;text-align:center">${footerUspRow()}${social}<p style="margin:20px 0 8px;color:${footerText}">${identity}</p><p style="margin:0">${footerLegalLink(impressum, "Impressum")} · ${footerLegalLink(datenschutz, "Datenschutz")}</p><p style="margin:16px 0 0;font-size:11px;color:${footerTextMuted}">Diese E-Mail wurde automatisch erstellt. Bitte antworte nicht direkt auf diese Nachricht.</p></td></tr></table>`;
}

export type TransactionalEmailWrapParams = {
  variant: TransactionalHeroVariant;
  documentTitle: string;
  heading: string;
  intro: string;
  /** Hauptinhalt: Karten, Tabellen, rein HTML, bereits escapet wo nötig. */
  bodyHtml: string;
  cta: { href: string; label: string };
  /** Optional aus ShopSettings; sonst jerry’s-Defaults. */
  branding?: TransactionalEmailBranding;
};

/**
 * Tabellenbasiertes Grundgerüst (max. 600px): weiße Karte, grüne Akzente nur bei Icon/Button/Linien.
 */
export function wrapTransactionalEmailHtml(p: TransactionalEmailWrapParams): string {
  const branding = brandingOrDefault(p.branding);
  const { text, pageBg, maxWidth, cardBorderNeutral } = TRANSACTIONAL_EMAIL_DESIGN;
  const circleBg = heroCircleBg();
  const icon = heroIconHtml(p.variant);
  const logoBlock = transactionalLogoBlock(branding);
  const mainCard = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${maxWidth}px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${cardBorderNeutral}"><tr><td style="padding:32px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:${text};background-color:#ffffff"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${logoBlock}<tr><td align="center" style="padding:4px 0 22px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" valign="middle" style="width:84px;height:84px;border-radius:50%;background:${circleBg};border:1px solid ${cardBorderNeutral};line-height:0;padding:16px">${icon}</td></tr></table></td></tr><tr><td style="font-size:22px;font-weight:700;color:#1f2937;line-height:1.35;text-align:center;padding-bottom:12px">${escapeHtmlForEmail(p.heading)}</td></tr><tr><td style="font-size:15px;line-height:1.55;color:${text};text-align:center;padding:0 4px 24px">${escapeHtmlForEmail(p.intro)}</td></tr><tr><td>${p.bodyHtml}</td></tr><tr><td align="center">${transactionalCtaButton(p.cta.href, p.cta.label, branding)}</td></tr></table></td></tr></table>`;

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="x-ua-compatible" content="ie=edge"/><title>${escapeHtmlForEmail(p.documentTitle)}</title></head><body style="margin:0;padding:0;background:${pageBg}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${pageBg}"><tr><td align="center" style="padding:24px 12px">${mainCard}</td></tr><tr><td align="center" style="padding:0 12px 24px">${transactionalEmailFooterBlock(branding)}</td></tr></table></body></html>`;
}

/**
 * HTML-Shell für editierbare Templates: Logo/Footer/CTA/Hero als {{{…}}}-Platzhalter,
 * Heading/Intro/Body als feste oder variable Inhalte.
 */
export function buildEditableTransactionalShell(params: {
  variant: TransactionalHeroVariant;
  /** Kann {{…}}-Platzhalter enthalten; wird nicht zusätzlich escapet. */
  documentTitle: string;
  heading: string;
  intro: string;
  bodyHtml: string;
}): string {
  const { text, pageBg, maxWidth, cardBorderNeutral } = TRANSACTIONAL_EMAIL_DESIGN;
  const circleBg = heroCircleBg();
  // Hero-Icon zur Laufzeit via {{{email.hero_icon_html}}} (absolute PNG-URL, kein Emoji).
  void params.variant;
  const mainCard = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${maxWidth}px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${cardBorderNeutral}"><tr><td style="padding:32px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:${text};background-color:#ffffff"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">{{{shop.logo_html}}}<tr><td align="center" style="padding:4px 0 22px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" valign="middle" style="width:84px;height:84px;border-radius:50%;background:${circleBg};border:1px solid ${cardBorderNeutral};line-height:0;padding:22px">{{{email.hero_icon_html}}}</td></tr></table></td></tr><tr><td style="font-size:22px;font-weight:700;color:#1f2937;line-height:1.35;text-align:center;padding-bottom:12px">${params.heading}</td></tr><tr><td style="font-size:15px;line-height:1.55;color:${text};text-align:center;padding:0 4px 24px">${params.intro}</td></tr><tr><td>${params.bodyHtml}</td></tr><tr><td align="center">{{{email.cta_html}}}</td></tr></table></td></tr></table>`;

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="x-ua-compatible" content="ie=edge"/><title>${params.documentTitle}</title></head><body style="margin:0;padding:0;background:${pageBg}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${pageBg}"><tr><td align="center" style="padding:24px 12px">${mainCard}</td></tr><tr><td align="center" style="padding:0 12px 24px">{{{shop.footer_html}}}</td></tr></table></body></html>`;
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
  /** Absolute Bild-URL für E-Mail-Clients (`absoluteUrlForEmail` / volle https-URL). */
  coverImageAbsoluteUrl?: string | null;
  coverImageAlt?: string | null;
};

export function buildOrderItemsTableHtml(
  items: OrderLineItemForEmail[],
  formatPrice: (cents: number, currency: string) => string,
): string {
  const rowDivider = "#eeeeee";
  const rows = items
    .map((i, index) => {
      const title = escapeHtmlForEmail(i.productTitleSnapshot);
      const qty = escapeHtmlForEmail(String(i.quantity));
      const price = escapeHtmlForEmail(formatPrice(i.lineTotalGrossCents, i.currency));
      const { text: tcol, textMuted: muted, cardBorderNeutral } = TRANSACTIONAL_EMAIL_DESIGN;
      const placeholder = "#f3f4f6";
      const alt = escapeHtmlForEmail(i.coverImageAlt?.trim() || i.productTitleSnapshot);
      const thumb =
        i.coverImageAbsoluteUrl?.trim() ?
          `<img src="${escapeHtmlForEmail(i.coverImageAbsoluteUrl.trim())}" alt="${alt}" width="52" height="52" border="0" style="display:block;width:52px;height:52px;border-radius:6px;object-fit:cover;border:1px solid ${cardBorderNeutral};line-height:0" />`
        : `<div style="width:52px;height:52px;border-radius:6px;background:${placeholder};border:1px solid ${cardBorderNeutral};font-size:10px;color:#9ca3af;text-align:center;line-height:52px">IMG</div>`;
      const isLast = index === items.length - 1;
      const rowBorder = isLast ? "" : `border-bottom:1px solid ${rowDivider};`;
      return `<tr><td style="padding:12px 0;${rowBorder}width:56px;vertical-align:middle;line-height:0">${thumb}</td><td style="padding:12px 0 12px 14px;${rowBorder}vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${tcol}"><strong style="color:#1f2937">${title}</strong><br/><span style="font-size:13px;color:${muted}">Menge: ${qty}</span></td><td style="padding:12px 0;${rowBorder}text-align:right;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1f2937;white-space:nowrap">${price}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 0">${rows}</table>`;
}
