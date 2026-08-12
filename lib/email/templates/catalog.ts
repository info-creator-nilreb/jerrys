/**
 * Katalog aller editierbaren Transaktions-Mails inkl. Variablen-Metadaten und Beispieldaten.
 */

export const EMAIL_TEMPLATE_KEYS = [
  "order_confirmation",
  "order_shipped",
  "order_cancelled",
  "order_refunded",
  "workshop_booking_confirmation",
  "workshop_booking_cancelled",
  "workshop_date_request_approved",
  "workshop_date_request_rejected",
  "email_verify",
  "magic_link",
  "password_reset",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export type EmailTemplateVariableDef = {
  path: string;
  label: string;
  /** true = unescaped HTML-Fragment (`{{{path}}}`) */
  html?: boolean;
  example: string;
};

export type EmailTemplateCatalogEntry = {
  key: EmailTemplateKey;
  name: string;
  description: string;
  group: "bestellungen" | "workshops" | "konto";
  variables: EmailTemplateVariableDef[];
};

const SHOP_VARS: EmailTemplateVariableDef[] = [
  { path: "shop.name", label: "Shop-Name", example: "jerry's" },
  { path: "shop.primary", label: "Primärfarbe", example: "#8bbe25" },
  { path: "shop.primary_strong", label: "Primärfarbe (stark)", example: "#4c864d" },
  {
    path: "shop.logo_html",
    label: "Logo-HTML",
    html: true,
    example: "<img alt=\"jerry's\" width=\"200\" />",
  },
  {
    path: "shop.footer_html",
    label: "Footer-HTML",
    html: true,
    example: "<p>jerry's · Impressum · Datenschutz</p>",
  },
];

const CTA_VARS: EmailTemplateVariableDef[] = [
  { path: "email.cta_url", label: "CTA-URL", example: "https://example.com/checkout/erfolg?nr=ORD-1001" },
  { path: "email.cta_label", label: "CTA-Beschriftung", example: "Bestellung ansehen" },
  {
    path: "email.cta_html",
    label: "CTA-Button-HTML",
    html: true,
    example: "<a href=\"#\">Bestellung ansehen</a>",
  },
];

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateCatalogEntry[] = [
  {
    key: "order_confirmation",
    name: "Bestellbestätigung",
    description: "Wird nach erfolgreicher Zahlung / Bestellung versendet.",
    group: "bestellungen",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      { path: "customer.first_name", label: "Vorname", example: "Alex" },
      { path: "order.number", label: "Bestellnummer", example: "ORD-1001" },
      { path: "order.subtotal", label: "Zwischensumme", example: "49,90 €" },
      { path: "order.shipping", label: "Versandkosten", example: "4,90 €" },
      { path: "order.total", label: "Gesamtbetrag", example: "54,80 €" },
      { path: "order.payment_method", label: "Zahlungsart", example: "PayPal" },
      {
        path: "order.number_card_html",
        label: "Bestellnummer-Karte",
        html: true,
        example: "<strong>Bestellnummer</strong><br/>#ORD-1001",
      },
      {
        path: "order.items_html",
        label: "Positionen-Tabelle",
        html: true,
        example: "<table>…</table>",
      },
      {
        path: "order.totals_html",
        label: "Summen-Tabelle",
        html: true,
        example: "<table>…</table>",
      },
      {
        path: "order.items_text",
        label: "Positionen (Text)",
        example: "- Produkt × 1: 49,90 €",
      },
    ],
  },
  {
    key: "order_shipped",
    name: "Versandbenachrichtigung",
    description: "Nach Statuswechsel auf „versendet“ (optional mit Rechnungs-PDF).",
    group: "bestellungen",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      { path: "customer.first_name", label: "Vorname", example: "Alex" },
      { path: "order.number", label: "Bestellnummer", example: "ORD-1001" },
      { path: "order.carrier_line", label: "Versandzeile", example: "DHL · 1234567890" },
      { path: "order.tracking_url", label: "Tracking-URL", example: "https://nolp.dhl.de/…" },
      { path: "order.invoice_number", label: "Rechnungsnummer", example: "RE-2026-0042" },
      { path: "order.invoice_note", label: "Rechnungshinweis", example: " (PDF angehängt)" },
      {
        path: "order.number_card_html",
        label: "Bestellnummer-Karte",
        html: true,
        example: "<strong>Bestellnummer</strong><br/>#ORD-1001",
      },
      {
        path: "order.items_html",
        label: "Positionen-Tabelle",
        html: true,
        example: "<table>…</table>",
      },
      {
        path: "order.shipping_details_html",
        label: "Versanddetails-HTML",
        html: true,
        example: "<p>Versand: DHL · …</p>",
      },
      {
        path: "order.items_text",
        label: "Positionen (Text)",
        example: "- Produkt × 1: 49,90 €",
      },
    ],
  },
  {
    key: "order_cancelled",
    name: "Storno-Benachrichtigung",
    description: "Nach Stornierung einer Bestellung.",
    group: "bestellungen",
    variables: [
      ...SHOP_VARS,
      { path: "customer.first_name", label: "Vorname", example: "Alex" },
      { path: "order.number", label: "Bestellnummer", example: "ORD-1001" },
      { path: "order.status_url", label: "Bestell-URL", example: "https://example.com/checkout/erfolg?nr=ORD-1001" },
    ],
  },
  {
    key: "order_refunded",
    name: "Erstattungsbenachrichtigung",
    description: "Nach erfolgreicher Erstattung.",
    group: "bestellungen",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      { path: "customer.first_name", label: "Vorname", example: "Alex" },
      { path: "order.number", label: "Bestellnummer", example: "ORD-1001" },
      { path: "order.total", label: "Erstattungsbetrag", example: "54,80 €" },
      { path: "order.refund_date", label: "Erstattungsdatum", example: "12.08.2026" },
      { path: "order.payment_method", label: "Zahlungsmethode", example: "PayPal" },
      {
        path: "order.number_card_html",
        label: "Bestellnummer-Karte",
        html: true,
        example: "<strong>Bestellnummer</strong><br/>#ORD-1001",
      },
      {
        path: "order.refund_card_html",
        label: "Erstattungsbetrag-Karte",
        html: true,
        example: "<strong>Erstattungsbetrag</strong><br/>54,80 €",
      },
      {
        path: "order.items_html",
        label: "Positionen-Tabelle",
        html: true,
        example: "<table>…</table>",
      },
      {
        path: "order.refund_meta_html",
        label: "Meta-Tabelle",
        html: true,
        example: "<table>…</table>",
      },
    ],
  },
  {
    key: "workshop_booking_confirmation",
    name: "Terminbestätigung",
    description: "Nach bestätigter Workshop-Buchung (mit .ics-Anhang).",
    group: "workshops",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      { path: "customer.first_name", label: "Vorname / Anrede", example: "Alex" },
      { path: "workshop.title", label: "Termin-Titel", example: "Gin Tasting" },
      { path: "workshop.when", label: "Datum/Uhrzeit", example: "Sa., 20.09.2026, 18:00" },
      { path: "workshop.location", label: "Ort", example: "jerry's Bar, Berlin" },
      { path: "workshop.seats", label: "Plätze", example: "2 Plätze" },
      { path: "workshop.price", label: "Preis", example: "79,00 €" },
      {
        path: "workshop.details_html",
        label: "Details-Karte",
        html: true,
        example: "<strong>Gin Tasting</strong>…",
      },
    ],
  },
  {
    key: "workshop_booking_cancelled",
    name: "Termin storniert",
    description: "Nach Stornierung einer Workshop-Buchung.",
    group: "workshops",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      { path: "customer.first_name", label: "Vorname / Anrede", example: "Alex" },
      { path: "workshop.title", label: "Termin-Titel", example: "Gin Tasting" },
      { path: "workshop.when", label: "Datum/Uhrzeit", example: "Sa., 20.09.2026, 18:00" },
      { path: "workshop.location", label: "Ort", example: "jerry's Bar, Berlin" },
      {
        path: "workshop.details_html",
        label: "Details-Karte",
        html: true,
        example: "<strong>Gin Tasting</strong>…",
      },
    ],
  },
  {
    key: "workshop_date_request_approved",
    name: "Wunschtermin angenommen",
    description: "Wenn eine Terminanfrage angenommen wurde.",
    group: "workshops",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      { path: "customer.first_name", label: "Name / Anrede", example: "Alex" },
      { path: "workshop.when", label: "Wunschzeit", example: "Sa., 20.09.2026, 18:00" },
      { path: "workshop.seats", label: "Plätze", example: "2 Plätze" },
      {
        path: "workshop.details_html",
        label: "Details-Karte",
        html: true,
        example: "<p>Wunschzeit: …</p>",
      },
    ],
  },
  {
    key: "workshop_date_request_rejected",
    name: "Wunschtermin abgelehnt",
    description: "Wenn eine Terminanfrage abgelehnt wurde.",
    group: "workshops",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      { path: "customer.first_name", label: "Name / Anrede", example: "Alex" },
      { path: "workshop.when", label: "Angefragte Zeit", example: "Sa., 20.09.2026, 18:00" },
      { path: "workshop.admin_note", label: "Hinweis vom Team", example: "Leider keine Kapazität." },
      {
        path: "workshop.details_html",
        label: "Details-Karte",
        html: true,
        example: "<p>Angefragte Zeit: …</p>",
      },
    ],
  },
  {
    key: "email_verify",
    name: "E-Mail bestätigen",
    description: "Nach Registrierung zur Bestätigung der E-Mail-Adresse.",
    group: "konto",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      {
        path: "email.notice_html",
        label: "Hinweis-Karte",
        html: true,
        example: "<p>Wenn du diese Anfrage nicht gestellt hast…</p>",
      },
    ],
  },
  {
    key: "magic_link",
    name: "Magic Link (Anmeldung)",
    description: "Passwortlose Anmeldung per Link (1 Stunde gültig).",
    group: "konto",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      {
        path: "email.notice_html",
        label: "Hinweis-Karte",
        html: true,
        example: "<p>Wenn du diese Anfrage nicht gestellt hast…</p>",
      },
    ],
  },
  {
    key: "password_reset",
    name: "Passwort zurücksetzen",
    description: "Link zum Zurücksetzen des Passworts (1 Stunde gültig).",
    group: "konto",
    variables: [
      ...SHOP_VARS,
      ...CTA_VARS,
      {
        path: "email.notice_html",
        label: "Hinweis-Karte",
        html: true,
        example: "<p>Wenn du diese Anfrage nicht gestellt hast…</p>",
      },
    ],
  },
];

export function getEmailTemplateCatalogEntry(
  key: EmailTemplateKey,
): EmailTemplateCatalogEntry {
  const entry = EMAIL_TEMPLATE_CATALOG.find((e) => e.key === key);
  if (!entry) throw new Error(`Unknown email template key: ${key}`);
  return entry;
}

export const EMAIL_TEMPLATE_GROUP_LABELS: Record<
  EmailTemplateCatalogEntry["group"],
  string
> = {
  bestellungen: "Bestellungen",
  workshops: "Workshops / Termine",
  konto: "Kundenkonto",
};

/** Beispieldaten für die Admin-Vorschau (alle bekannten Pfade). */
export function sampleVarsForTemplate(key: EmailTemplateKey): Record<string, unknown> {
  const entry = getEmailTemplateCatalogEntry(key);
  const flat: Record<string, string> = {};
  for (const v of entry.variables) {
    flat[v.path] = v.example;
  }
  // Nested object for render engine
  const root: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!;
      if (typeof cur[p] !== "object" || cur[p] == null) cur[p] = {};
      cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]!] = value;
  }
  return root;
}
