import "server-only";

import {
  grayInfoCard,
  heroIconHtml,
  transactionalCtaButton,
  transactionalEmailFooterBlock,
  transactionalLogoBlock,
  type TransactionalHeroVariant,
} from "@/lib/email/transactional-email-layout";
import { absoluteUrlForEmail } from "@/lib/email/email-absolute-url";
import {
  resolveEmailLogoAbsoluteUrl,
  type TransactionalEmailBranding,
} from "@/lib/shop/email-branding";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import type { TemplateVars } from "@/lib/email/templates/render";

function resolveLogoAbsoluteUrlForRender(
  branding: TransactionalEmailBranding,
  settings?: ShopSettingsDTO | null,
): string | null {
  if (settings) {
    const fromSettings = resolveEmailLogoAbsoluteUrl(settings);
    if (fromSettings) return fromSettings;
  }
  const cached = branding.logoAbsoluteUrl?.trim();
  if (cached) return cached;
  return absoluteUrlForEmail("/branding/jerrys-wordmark.jpg");
}

/** Gemeinsame Shop-/CTA-/Hero-Fragmente für Template-Rendering. */
export function buildShopTemplateVars(
  branding: TransactionalEmailBranding,
  options?: {
    cta?: { href: string; label: string };
    heroVariant?: TransactionalHeroVariant;
    /** Shop-Einstellungen: Logo-URL zur Render-Zeit auflösen (Preview-Deploys). */
    settings?: ShopSettingsDTO | null;
  },
): TemplateVars {
  const cta = options?.cta;
  const heroVariant = options?.heroVariant ?? "order";
  const logoAbsoluteUrl = resolveLogoAbsoluteUrlForRender(branding, options?.settings);
  return {
    shop: {
      name: branding.shopName,
      primary: branding.primary,
      primary_strong: branding.primaryStrong,
      logo_html: transactionalLogoBlock({ ...branding, logoAbsoluteUrl }),
      footer_html: transactionalEmailFooterBlock(branding),
    },
    email: {
      cta_url: cta?.href ?? "",
      cta_label: cta?.label ?? "",
      cta_html: cta
        ? transactionalCtaButton(cta.href, cta.label, branding)
        : "",
      hero_icon_html: heroIconHtml(heroVariant),
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
