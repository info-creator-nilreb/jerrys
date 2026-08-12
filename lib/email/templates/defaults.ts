import {
  TRANSACTIONAL_EMAIL_DESIGN,
  buildEditableTransactionalShell,
} from "@/lib/email/transactional-email-layout";
import type { EmailTemplateKey } from "@/lib/email/templates/catalog";
import { getEmailTemplateCatalogEntry } from "@/lib/email/templates/catalog";

export type EmailTemplateDefaultContent = {
  key: EmailTemplateKey;
  name: string;
  description: string;
  subject: string;
  htmlBody: string;
  textBody: string;
};

const { textMuted, divider } = TRANSACTIONAL_EMAIL_DESIGN;

function orderConfirmationHtml(): string {
  return buildEditableTransactionalShell({
    variant: "order",
    documentTitle: "{{order.number}}",
    heading: "Vielen Dank für deine Bestellung!",
    intro: "Wir haben deine Bestellung erhalten und bereiten sie mit Sorgfalt vor.",
    bodyHtml: `{{{order.number_card_html}}}{{{order.items_html}}}{{{order.totals_html}}}`,
  });
}

function orderShippedHtml(): string {
  return buildEditableTransactionalShell({
    variant: "shipping",
    documentTitle: "Versand {{order.number}}",
    heading: "Deine Bestellung ist unterwegs!",
    intro: "Gute Neuigkeiten: deine Bestellung wurde versendet und ist jetzt auf dem Weg zu dir.",
    bodyHtml: `{{{order.number_card_html}}}{{{order.items_html}}}{{{order.shipping_details_html}}}<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid ${divider};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${textMuted}">Rückfragen über die Kontaktdaten im Impressum.</p>`,
  });
}

function orderCancelledHtml(): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/><title>Storno {{order.number}}</title></head><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hallo {{customer.first_name}},</p>
<p>deine Bestellung <strong>{{order.number}}</strong> wurde storniert.</p>
<p>Bei Fragen nutze bitte die Kontaktdaten im Impressum.</p>
<p style="margin-top:1.25rem"><a href="{{order.status_url}}">Bestellung ansehen</a></p>
<p>Liebe Grüße<br/>{{shop.name}}</p>
</body></html>`;
}

function orderRefundedHtml(): string {
  return buildEditableTransactionalShell({
    variant: "refund",
    documentTitle: "Erstattung {{order.number}}",
    heading: "Deine Erstattung wurde veranlasst",
    intro:
      "Wir haben deine Rückerstattung bearbeitet. Der Betrag wird in Kürze auf deinem Konto gutgeschrieben (je nach Zahlungsart kann es einige Werktage dauern).",
    bodyHtml: `{{{order.number_card_html}}}{{{order.refund_card_html}}}{{{order.items_html}}}{{{order.refund_meta_html}}}`,
  });
}

function workshopConfirmHtml(): string {
  return buildEditableTransactionalShell({
    variant: "workshop",
    documentTitle: "Terminbestätigung: {{workshop.title}}",
    heading: "Dein Termin ist bestätigt",
    intro: "Wir freuen uns auf dich — speichere den Termin am besten direkt in deinem Kalender.",
    bodyHtml: `{{{workshop.details_html}}}`,
  });
}

function workshopCancelHtml(): string {
  return buildEditableTransactionalShell({
    variant: "workshop",
    documentTitle: "Termin storniert: {{workshop.title}}",
    heading: "Termin storniert",
    intro: "Deine Buchung ist nicht mehr aktiv. Wir hoffen, dich bald bei einem anderen Termin zu sehen.",
    bodyHtml: `{{{workshop.details_html}}}`,
  });
}

function dateRequestApprovedHtml(): string {
  return buildEditableTransactionalShell({
    variant: "workshop",
    documentTitle: "Wunschtermin angenommen",
    heading: "Wunschtermin angenommen",
    intro: "Danke für deine Anfrage — wir melden uns, sobald der Termin buchbar ist.",
    bodyHtml: `{{{workshop.details_html}}}`,
  });
}

function dateRequestRejectedHtml(): string {
  return buildEditableTransactionalShell({
    variant: "workshop",
    documentTitle: "Zu deiner Terminanfrage",
    heading: "Terminanfrage nicht möglich",
    intro: "Schau gern in unserem Terminkalender nach Alternativen oder stelle eine neue Anfrage.",
    bodyHtml: `{{{workshop.details_html}}}`,
  });
}

function authHtml(heading: string, intro: string): string {
  return buildEditableTransactionalShell({
    variant: "account",
    documentTitle: heading,
    heading,
    intro,
    bodyHtml: `{{{email.notice_html}}}`,
  });
}

const DEFAULTS: Record<EmailTemplateKey, Omit<EmailTemplateDefaultContent, "key" | "name" | "description">> = {
  order_confirmation: {
    subject: "Bestellbestätigung {{order.number}}",
    htmlBody: orderConfirmationHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "vielen Dank für deine Bestellung bei {{shop.name}}.",
      "",
      "Bestellnummer: {{order.number}}",
      "Zwischensumme: {{order.subtotal}}",
      "Versand: {{order.shipping}}",
      "Gesamt: {{order.total}} inkl. MwSt.",
      "Zahlungsart: {{order.payment_method}}",
      "",
      "Positionen:",
      "{{order.items_text}}",
      "",
      "Bestellung ansehen: {{email.cta_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  order_shipped: {
    subject: "Deine Bestellung {{order.number}} wurde versendet",
    htmlBody: orderShippedHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "gute Neuigkeiten: deine Bestellung wurde versendet und ist auf dem Weg zu dir.",
      "",
      "Bestellnummer: {{order.number}}",
      "",
      "Versand:",
      "{{order.carrier_line}}",
      "",
      "Sendung verfolgen: {{order.tracking_url}}",
      "",
      "Rechnungsnummer: {{order.invoice_number}}",
      "",
      "Positionen:",
      "{{order.items_text}}",
      "",
      "Zur Bestellung: {{email.cta_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  order_cancelled: {
    subject: "Storno zu Bestellung {{order.number}}",
    htmlBody: orderCancelledHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "deine Bestellung {{order.number}} wurde storniert.",
      "",
      "Bei Fragen erreichst du uns über die Kontaktdaten im Impressum.",
      "",
      "Link zur Bestellübersicht: {{order.status_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  order_refunded: {
    subject: "Erstattung zu Bestellung {{order.number}}",
    htmlBody: orderRefundedHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "wir haben deine Rückerstattung bearbeitet. Der Betrag wird in Kürze auf deinem Konto gutgeschrieben (je nach Zahlungsart einige Werktage).",
      "",
      "Bestellnummer: {{order.number}}",
      "Erstattungsbetrag: {{order.total}}",
      "Erstattet am: {{order.refund_date}}",
      "Zahlungsmethode: {{order.payment_method}}",
      "",
      "Bei Rückfragen erreichst du uns über die Kontaktdaten im Impressum.",
      "",
      "Shop: {{email.cta_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  workshop_booking_confirmation: {
    subject: "Terminbestätigung: {{workshop.title}}",
    htmlBody: workshopConfirmHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "dein Workshop-Termin bei {{shop.name}} ist bestätigt.",
      "",
      "{{workshop.title}}",
      "{{workshop.when}}",
      "Ort: {{workshop.location}}",
      "Plätze: {{workshop.seats}}",
      "Preis: {{workshop.price}}",
      "",
      "Im Anhang findest du einen Kalendereintrag (.ics).",
      "",
      "Termin im Konto: {{email.cta_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  workshop_booking_cancelled: {
    subject: "Termin storniert: {{workshop.title}}",
    htmlBody: workshopCancelHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "deine Workshop-Buchung wurde storniert.",
      "",
      "{{workshop.title}}",
      "{{workshop.when}}",
      "Ort: {{workshop.location}}",
      "",
      "Bei kostenpflichtigen Buchungen bearbeiten wir Erstattungen gesondert, sofern eine Zahlung erfolgt ist.",
      "",
      "Weitere Termine: {{email.cta_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  workshop_date_request_approved: {
    subject: "Dein Wunschtermin wurde angenommen",
    htmlBody: dateRequestApprovedHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "wir haben deine Terminanfrage angenommen und einen Terminentwurf angelegt.",
      "",
      "Wunschzeit: {{workshop.when}}",
      "Plätze: {{workshop.seats}}",
      "",
      "Sobald der Termin veröffentlicht ist, kannst du ihn unter „Termine“ buchen.",
      "",
      "{{email.cta_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  workshop_date_request_rejected: {
    subject: "Zu deiner Terminanfrage",
    htmlBody: dateRequestRejectedHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "leider können wir deinen Wunschtermin so nicht anbieten.",
      "",
      "Angefragte Zeit: {{workshop.when}}",
      "",
      "Hinweis vom Team:",
      "{{workshop.admin_note}}",
      "",
      "Du kannst jederzeit eine neue Anfrage stellen oder einen veröffentlichten Termin buchen.",
      "",
      "{{email.cta_url}}",
      "",
      "Liebe Grüße",
      "{{shop.name}}",
    ].join("\n"),
  },
  email_verify: {
    subject: "Bitte E-Mail bestätigen — {{shop.name}}",
    htmlBody: authHtml(
      "E-Mail bestätigen",
      "Bitte bestätige deine E-Mail-Adresse, um dein Kundenkonto zu aktivieren.",
    ),
    textBody: [
      "E-Mail bestätigen",
      "",
      "Bitte bestätige deine E-Mail-Adresse, um dein Kundenkonto zu aktivieren.",
      "",
      "{{email.cta_label}}: {{email.cta_url}}",
      "",
      "Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.",
    ].join("\n"),
  },
  magic_link: {
    subject: "Dein Anmelde-Link — {{shop.name}}",
    htmlBody: authHtml(
      "Magic Link",
      "Mit diesem Link meldest du dich sicher bei {{shop.name}} an. Der Link ist eine Stunde gültig.",
    ),
    textBody: [
      "Magic Link",
      "",
      "Mit diesem Link meldest du dich sicher bei {{shop.name}} an. Der Link ist eine Stunde gültig.",
      "",
      "{{email.cta_label}}: {{email.cta_url}}",
      "",
      "Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.",
    ].join("\n"),
  },
  password_reset: {
    subject: "Passwort zurücksetzen — {{shop.name}}",
    htmlBody: authHtml(
      "Passwort zurücksetzen",
      "Du hast das Zurücksetzen deines Passworts angefordert. Der Link ist eine Stunde gültig.",
    ),
    textBody: [
      "Passwort zurücksetzen",
      "",
      "Du hast das Zurücksetzen deines Passworts angefordert. Der Link ist eine Stunde gültig.",
      "",
      "{{email.cta_label}}: {{email.cta_url}}",
      "",
      "Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.",
    ].join("\n"),
  },
};

export function getEmailTemplateDefault(key: EmailTemplateKey): EmailTemplateDefaultContent {
  const meta = getEmailTemplateCatalogEntry(key);
  const content = DEFAULTS[key];
  return {
    key,
    name: meta.name,
    description: meta.description,
    ...content,
  };
}

export function getAllEmailTemplateDefaults(): EmailTemplateDefaultContent[] {
  return (Object.keys(DEFAULTS) as EmailTemplateKey[]).map(getEmailTemplateDefault);
}
