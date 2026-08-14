import {
  buildOrderlyEmailHtml,
  orderlyClosing,
  orderlyCtaBlock,
  orderlyDivider,
  orderlyHeading,
  orderlyIntro,
  orderlySection,
  orderlyWorkshopClosing,
} from "@/lib/email/templates/orderly-email-shell";

export function buildWorkshopBookingConfirmationOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Terminbestätigung: {{workshop.title}}",
    previewText: "Dein Termin bei {{shop.name}} ist bestätigt.",
    bodyHtml: [
      orderlyHeading("Dein Termin ist bestätigt"),
      orderlyIntro(
        `<p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p><p style="margin:0;">wir freuen uns auf dich — speichere den Termin am besten direkt in deinem Kalender.</p>`,
      ),
      orderlySection("{{{workshop.details_html}}}", "11px 44px"),
      orderlyDivider(),
      orderlyCtaBlock(`<p style="margin:0 0 16px;">Termindetails und Kalenderdownload:</p>`),
      orderlyWorkshopClosing(),
    ].join(""),
  });
}

export function buildWorkshopBookingCancelledOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Termin storniert: {{workshop.title}}",
    previewText: "Deine Workshop-Buchung wurde storniert.",
    bodyHtml: [
      orderlyHeading("Termin storniert"),
      orderlyIntro(
        `<p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p><p style="margin:0;">deine Buchung ist nicht mehr aktiv. Wir hoffen, dich bald bei einem anderen Termin zu sehen.</p>`,
      ),
      orderlySection("{{{workshop.details_html}}}", "11px 44px"),
      orderlyDivider(),
      orderlyCtaBlock(`<p style="margin:0 0 16px;">Weitere Termine findest du hier:</p>`),
      orderlyWorkshopClosing(),
    ].join(""),
  });
}

export function buildWorkshopDateRequestApprovedOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Wunschtermin angenommen",
    previewText: "Wir haben deine Terminanfrage angenommen.",
    bodyHtml: [
      orderlyHeading("Wunschtermin angenommen"),
      orderlyIntro(
        `<p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p><p style="margin:0;">Danke für deine Anfrage — wir melden uns, sobald der Termin buchbar ist.</p>`,
      ),
      orderlySection("{{{workshop.details_html}}}", "11px 44px"),
      orderlyDivider(),
      orderlyCtaBlock(`<p style="margin:0 0 16px;">Veröffentlichte Termine:</p>`),
      orderlyWorkshopClosing(),
    ].join(""),
  });
}

export function buildWorkshopDateRequestRejectedOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Zu deiner Terminanfrage",
    previewText: "Leider können wir deinen Wunschtermin so nicht anbieten.",
    bodyHtml: [
      orderlyHeading("Terminanfrage nicht möglich"),
      orderlyIntro(
        `<p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p><p style="margin:0;">Schau gern in unserem Terminkalender nach Alternativen oder stelle eine neue Anfrage.</p>`,
      ),
      orderlySection("{{{workshop.details_html}}}", "11px 44px"),
      orderlyDivider(),
      orderlyCtaBlock(`<p style="margin:0 0 16px;">Termine ansehen:</p>`),
      orderlyWorkshopClosing(),
    ].join(""),
  });
}
