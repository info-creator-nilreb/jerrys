import "server-only";

import type { EmailTemplateKey } from "@/lib/email/templates/catalog";
import { sampleVarsForTemplate } from "@/lib/email/templates/catalog";
import {
  authAfterButtonNoteHtml,
  customerGreetingHtml,
} from "@/lib/email/templates/auth-email-fragments";
import { buildPreviewOrderFragments } from "@/lib/email/templates/preview-order-fragments";
import { buildPreviewWorkshopFragments } from "@/lib/email/templates/preview-workshop-fragments";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import type { TransactionalHeroVariant } from "@/lib/email/email-icon-assets";
import type { TransactionalEmailBranding } from "@/lib/shop/email-branding";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
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

const ORDER_PREVIEW_CTA_LABEL: Partial<Record<EmailTemplateKey, string>> = {
  order_confirmation: "Bestellung ansehen",
  order_shipped: "Zur Bestellung",
  order_picked_up: "Zur Bestellung",
  order_refunded: "Zurück zum Shop",
};

const ORDER_TEMPLATE_KEYS = new Set<EmailTemplateKey>([
  "order_confirmation",
  "order_shipped",
  "order_picked_up",
  "order_cancelled",
  "order_refunded",
]);

const WORKSHOP_PREVIEW_CTA_LABEL: Partial<Record<EmailTemplateKey, string>> = {
  workshop_booking_confirmation: "Termin im Konto ansehen",
  workshop_booking_cancelled: "Termine im Konto",
  workshop_date_request_approved: "Termine ansehen",
  workshop_date_request_rejected: "Termine ansehen",
};

const WORKSHOP_TEMPLATE_KEYS = new Set<EmailTemplateKey>([
  "workshop_booking_confirmation",
  "workshop_booking_cancelled",
  "workshop_date_request_approved",
  "workshop_date_request_rejected",
]);

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
  settings?: ShopSettingsDTO | null,
): TemplateVars {
  const sample = sampleVarsForTemplate(key);
  const ctaHref = String(
    (sample.email as { cta_url?: string } | undefined)?.cta_url ?? "https://example.com",
  );
  const ctaLabel =
    AUTH_PREVIEW_CTA_LABEL[key] ??
    ORDER_PREVIEW_CTA_LABEL[key] ??
    WORKSHOP_PREVIEW_CTA_LABEL[key] ??
    String((sample.email as { cta_label?: string } | undefined)?.cta_label ?? "Weiter");

  const vars = mergeTemplateVars(
    sample,
    buildShopTemplateVars(branding, {
      cta: { href: ctaHref, label: ctaLabel },
      heroVariant: heroVariantForTemplate(key),
      settings,
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

  if (ORDER_TEMPLATE_KEYS.has(key)) {
    return mergeTemplateVars(vars, {
      customer: { first_name: "Alex" },
      order: buildPreviewOrderFragments(branding),
    });
  }

  const workshopFragments = buildPreviewWorkshopFragments(key);
  if (workshopFragments) {
    return mergeTemplateVars(vars, {
      customer: { first_name: "Alex" },
      workshop: workshopFragments,
    });
  }

  return vars;
}
