import { absoluteUrlForEmail } from "@/lib/email/email-absolute-url";

/** Hero-Varianten für Transaktions-Mails (Icons + Layout). */
export type TransactionalHeroVariant = "order" | "shipping" | "refund" | "account" | "workshop";

/** Statische Lucide-ähnliche PNGs unter `public/branding/email-icons/` (Gmail/Outlook strippen SVG). */
const HERO_ICON_PATH: Record<TransactionalHeroVariant, string> = {
  order: "/branding/email-icons/shopping-bag.png",
  shipping: "/branding/email-icons/truck.png",
  refund: "/branding/email-icons/banknote.png",
  account: "/branding/email-icons/key-round.png",
  workshop: "/branding/email-icons/calendar-days.png",
};

const FOOTER_ICON_PATH = {
  lock: "/branding/email-icons/lock-light.png",
  truck: "/branding/email-icons/truck-light.png",
  mail: "/branding/email-icons/mail-light.png",
  instagram: "/branding/email-icons/instagram-light.png",
} as const;

/**
 * Absolute HTTPS-URL für E-Mail-Icons. Ohne Site-Base → null (Caller zeigt dann nichts).
 */
export function absoluteEmailIconUrl(path: string): string | null {
  return absoluteUrlForEmail(path);
}

export function heroIconPublicPath(variant: TransactionalHeroVariant): string {
  return HERO_ICON_PATH[variant];
}

export function footerIconPublicPath(kind: keyof typeof FOOTER_ICON_PATH): string {
  return FOOTER_ICON_PATH[kind];
}
