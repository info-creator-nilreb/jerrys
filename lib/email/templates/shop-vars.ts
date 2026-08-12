import "server-only";

import {
  grayInfoCard,
  transactionalCtaButton,
  transactionalEmailFooterBlock,
  transactionalLogoBlock,
} from "@/lib/email/transactional-email-layout";
import type { TransactionalEmailBranding } from "@/lib/shop/email-branding";
import type { TemplateVars } from "@/lib/email/templates/render";

/** Gemeinsame Shop-/CTA-Fragmente für Template-Rendering. */
export function buildShopTemplateVars(
  branding: TransactionalEmailBranding,
  cta?: { href: string; label: string },
): TemplateVars {
  return {
    shop: {
      name: branding.shopName,
      primary: branding.primary,
      primary_strong: branding.primaryStrong,
      logo_html: transactionalLogoBlock(branding),
      footer_html: transactionalEmailFooterBlock(branding),
    },
    email: {
      cta_url: cta?.href ?? "",
      cta_label: cta?.label ?? "",
      cta_html: cta
        ? transactionalCtaButton(cta.href, cta.label, branding)
        : "",
      notice_html: grayInfoCard(
        `<p style="margin:0">Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>`,
      ),
    },
  };
}

export function mergeTemplateVars(...parts: TemplateVars[]): TemplateVars {
  const out: TemplateVars = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof out[key] === "object" &&
        out[key] != null &&
        !Array.isArray(out[key])
      ) {
        out[key] = {
          ...(out[key] as Record<string, unknown>),
          ...(value as Record<string, unknown>),
        };
      } else {
        out[key] = value;
      }
    }
  }
  return out;
}
