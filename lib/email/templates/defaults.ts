import type { EmailTemplateKey } from "@/lib/email/templates/catalog";
import { getEmailTemplateCatalogEntry } from "@/lib/email/templates/catalog";
import {
  buildEmailVerifyOrderlyHtml,
  buildMagicLinkOrderlyHtml,
  buildPasswordResetOrderlyHtml,
} from "@/lib/email/templates/auth-email-orderly-html";
import { buildOrderConfirmationOrderlyHtml } from "@/lib/email/templates/order-confirmation-orderly-html";
import {
  buildOrderCancelledOrderlyHtml,
  buildOrderRefundedOrderlyHtml,
  buildOrderShippedOrderlyHtml,
} from "@/lib/email/templates/order-transactional-orderly-html";
import {
  buildWorkshopBookingCancelledOrderlyHtml,
  buildWorkshopBookingConfirmationOrderlyHtml,
  buildWorkshopDateRequestApprovedOrderlyHtml,
  buildWorkshopDateRequestRejectedOrderlyHtml,
} from "@/lib/email/templates/workshop-email-orderly-html";

export type EmailTemplateDefaultContent = {
  key: EmailTemplateKey;
  name: string;
  description: string;
  subject: string;
  htmlBody: string;
  textBody: string;
};

const DEFAULTS: Record<EmailTemplateKey, Omit<EmailTemplateDefaultContent, "key" | "name" | "description">> = {
  order_confirmation: {
    subject: "Bestellbestätigung {{order.number}}",
    htmlBody: buildOrderConfirmationOrderlyHtml(),
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
      "Versandadresse:",
      "{{order.shipping_address_text}}",
      "",
      "Rechnungsadresse:",
      "{{order.billing_address_text}}",
      "",
      "Bestellung ansehen: {{email.cta_url}}",
      "",
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  order_shipped: {
    subject: "Deine Bestellung {{order.number}} wurde versendet",
    htmlBody: buildOrderShippedOrderlyHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "wir freuen uns, dir mitteilen zu können, dass deine Bestellung versandt wurde!",
      "",
      "Bestellnummer: {{order.number}}",
      "",
      "Versandadresse:",
      "{{order.shipping_address_text}}",
      "",
      "Versand:",
      "{{order.carrier_line}}",
      "",
      "Sendung verfolgen: {{order.tracking_url}}",
      "",
      "Rechnungsnummer: {{order.invoice_number}}{{order.invoice_note}}",
      "",
      "Positionen:",
      "{{order.items_text}}",
      "",
      "Zur Bestellung: {{email.cta_url}}",
      "",
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  order_cancelled: {
    subject: "Storno zu Bestellung {{order.number}}",
    htmlBody: buildOrderCancelledOrderlyHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "hiermit bestätigen wir dir, dass deine Bestellung storniert wurde.",
      "",
      "Bestellnummer: {{order.number}}",
      "Storniert am: {{order.cancelled_date}}",
      "",
      "Positionen:",
      "{{order.items_text}}",
      "",
      "Bei Fragen erreichst du uns über die Kontaktdaten im Impressum.",
      "",
      "Bestellung ansehen: {{order.status_url}}",
      "",
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  order_refunded: {
    subject: "Erstattung zu Bestellung {{order.number}}",
    htmlBody: buildOrderRefundedOrderlyHtml(),
    textBody: [
      "Hallo {{customer.first_name}},",
      "",
      "wir haben dir deine Bestellung erstattet. Bitte beachte, dass es einige Tage dauern kann, bis die Erstattung auf deinen Bank- oder Kreditkartenauszügen erscheint.",
      "",
      "Bestellnummer: {{order.number}}",
      "Erstattungsbetrag: {{order.total}}",
      "Erstattet am: {{order.refund_date}}",
      "Zahlungsmethode: {{order.payment_method}}",
      "",
      "Positionen:",
      "{{order.items_text}}",
      "",
      "Bei Rückfragen erreichst du uns über die Kontaktdaten im Impressum.",
      "",
      "Shop: {{email.cta_url}}",
      "",
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  workshop_booking_confirmation: {
    subject: "Terminbestätigung: {{workshop.title}}",
    htmlBody: buildWorkshopBookingConfirmationOrderlyHtml(),
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
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  workshop_booking_cancelled: {
    subject: "Termin storniert: {{workshop.title}}",
    htmlBody: buildWorkshopBookingCancelledOrderlyHtml(),
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
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  workshop_date_request_approved: {
    subject: "Dein Wunschtermin wurde angenommen",
    htmlBody: buildWorkshopDateRequestApprovedOrderlyHtml(),
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
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  workshop_date_request_rejected: {
    subject: "Zu deiner Terminanfrage",
    htmlBody: buildWorkshopDateRequestRejectedOrderlyHtml(),
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
      "Viele Grüße",
      "Dein {{shop.name}}-Team",
    ].join("\n"),
  },
  email_verify: {
    subject: "Bitte E-Mail bestätigen — {{shop.name}}",
    htmlBody: buildEmailVerifyOrderlyHtml(),
    textBody: [
      "E-Mail bestätigen",
      "",
      "Bitte bestätige deine E-Mail-Adresse, um dein Kundenkonto zu aktivieren.",
      "",
      "{{email.cta_label}}: {{email.cta_url}}",
      "",
      "Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.",
    ].join("\n"),
  },
  magic_link: {
    subject: "Dein Anmelde-Link — {{shop.name}}",
    htmlBody: buildMagicLinkOrderlyHtml(),
    textBody: [
      "Anmelden",
      "",
      "Mit diesem Link meldest du dich sicher bei {{shop.name}} an. Der Link ist eine Stunde gültig.",
      "",
      "{{email.cta_label}}: {{email.cta_url}}",
      "",
      "Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.",
    ].join("\n"),
  },
  password_reset: {
    subject: "Passwort zurücksetzen — {{shop.name}}",
    htmlBody: buildPasswordResetOrderlyHtml(),
    textBody: [
      "Dein Passwort zurücksetzen",
      "",
      "du hast darum gebeten, dass das Passwort für dein Konto zurückgesetzt wird. Bitte bestätige deine Anfrage.",
      "",
      "{{email.cta_label}}: {{email.cta_url}}",
      "",
      "Solltest du diese E-Mail irrtümlich erhalten haben, kannst du diese ignorieren.",
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
