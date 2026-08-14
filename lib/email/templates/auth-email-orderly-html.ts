import {
  buildOrderlyEmailHtml,
  orderlyAuthActionBlock,
  orderlyHeading,
  orderlyIntro,
} from "@/lib/email/templates/orderly-email-shell";

export function buildEmailVerifyOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "E-Mail bestätigen — {{shop.name}}",
    previewText: "Bitte bestätige deine E-Mail-Adresse, um dein Kundenkonto zu aktivieren.",
    bodyHtml: [
      orderlyHeading("E-Mail bestätigen"),
      orderlyIntro(
        `{{{customer.greeting_html}}}<p style="margin:0;">Bitte bestätige deine E-Mail-Adresse, um dein Kundenkonto zu aktivieren.</p>`,
      ),
      orderlyAuthActionBlock(),
    ].join(""),
  });
}

export function buildMagicLinkOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Dein Anmelde-Link — {{shop.name}}",
    previewText: "Mit diesem Link meldest du dich sicher bei {{shop.name}} an.",
    bodyHtml: [
      orderlyHeading("Anmelden"),
      orderlyIntro(
        `{{{customer.greeting_html}}}<p style="margin:0;">Mit diesem Link meldest du dich sicher bei {{shop.name}} an. Der Link ist eine Stunde gültig.</p>`,
      ),
      orderlyAuthActionBlock(),
    ].join(""),
  });
}

export function buildPasswordResetOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Passwort zurücksetzen — {{shop.name}}",
    previewText:
      "Du hast darum gebeten, dass das Passwort für dein Konto zurückgesetzt wird. Bitte bestätige deine Anfrage.",
    bodyHtml: [
      orderlyHeading("Dein Passwort zurücksetzen"),
      orderlyIntro(
        `{{{customer.greeting_html}}}<p style="margin:0;">du hast darum gebeten, dass das Passwort für dein Konto zurückgesetzt wird. Bitte bestätige deine Anfrage.</p>`,
      ),
      orderlyAuthActionBlock(),
    ].join(""),
  });
}
