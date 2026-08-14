import "server-only";

import type { EmailTemplateKey } from "@/lib/email/templates/catalog";
import { sampleVarsForTemplate } from "@/lib/email/templates/catalog";
import {
  authAfterButtonNoteHtml,
  customerGreetingHtml,
} from "@/lib/email/templates/auth-email-fragments";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import type { TransactionalHeroVariant } from "@/lib/email/email-icon-assets";
import type { TransactionalEmailBranding } from "@/lib/shop/email-branding";
import type { TemplateVars } from "@/lib/email/templates/render";

const AUTH_PREVIEW_CTA_LABEL: Partial<Record<EmailTemplateKey, string>> = {
  email_verify: "E-Mail bestätigen",
  magic_link: "Jetzt anmelden",
  password_reset: "Passwort zurücksetzen",
};

const AUTH_PREVIEW_NOTE_TEXT: Partial<Record<EmailTemplateKey, string>> = {
  email_verify: "Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.",
  magic_link: "Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.",
  password_reset:
    "Solltest du diese E-Mail irrtümlich erhalten haben, kannst du diese ignorieren.",
};

export function heroVariantForTemplate(key: EmailTemplateKey): TransactionalHeroVariant {
  switch (key) {
    case "order_shipped":
      return "shipping";
    case "order_refunded":
      return "refund";
    case "email_verify":
    case "magic_link":
    case "password_reset":
      return "account";
    case "workshop_booking_confirmation":
    case "workshop_booking_cancelled":
    case "workshop_date_request_approved":
    case "workshop_date_request_rejected":
      return "workshop";
    default:
      return "order";
  }
}

/** Beispieldaten + Shop-Branding für Vorschau und Testversand. */
export function buildEmailTemplatePreviewVars(
  key: EmailTemplateKey,
  branding: TransactionalEmailBranding,
): TemplateVars {
  const sample = sampleVarsForTemplate(key);
  const ctaHref = String(
    (sample.email as { cta_url?: string } | undefined)?.cta_url ?? "https://example.com",
  );
  const ctaLabel =
    AUTH_PREVIEW_CTA_LABEL[key] ??
    String((sample.email as { cta_label?: string } | undefined)?.cta_label ?? "Weiter");

  const vars = mergeTemplateVars(
    sample,
    buildShopTemplateVars(branding, {
      cta: { href: ctaHref, label: ctaLabel },
      heroVariant: heroVariantForTemplate(key),
    }),
  );

  const authNote = AUTH_PREVIEW_NOTE_TEXT[key];
  if (authNote) {
    return mergeTemplateVars(vars, {
      customer: {
        first_name: "Alex",
        greeting_html: customerGreetingHtml("Alex"),
      },
      email: {
        after_button_note_html: authAfterButtonNoteHtml(authNote),
      },
    });
  }

  return vars;
}
