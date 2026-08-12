import "server-only";

import type { EmailTemplateKey } from "@/lib/email/templates/catalog";
import { sampleVarsForTemplate } from "@/lib/email/templates/catalog";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import type { TransactionalHeroVariant } from "@/lib/email/email-icon-assets";
import type { TransactionalEmailBranding } from "@/lib/shop/email-branding";
import type { TemplateVars } from "@/lib/email/templates/render";

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
  return mergeTemplateVars(
    sample,
    buildShopTemplateVars(branding, {
      cta: {
        href: String(
          (sample.email as { cta_url?: string } | undefined)?.cta_url ?? "https://example.com",
        ),
        label: String(
          (sample.email as { cta_label?: string } | undefined)?.cta_label ?? "Weiter",
        ),
      },
      heroVariant: heroVariantForTemplate(key),
    }),
  );
}
