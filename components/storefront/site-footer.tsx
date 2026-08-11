import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/storefront/cookie-consent/cookie-settings-button";
import { listActiveCategoriesForNav } from "@/lib/catalog/category-queries";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import { listPublishedContentNavLinks } from "@/lib/content/content-public-discovery";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { shopFooterTagline } from "@/lib/shop/storefront-branding";
import {
  buildStorefrontShopNavLinks,
  resolveFooterMerchandisingLinks,
} from "@/lib/storefront/shop-nav-links";

const legalLinks = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerruf" },
  { href: "/rueckgabe", label: "Rückgabe" },
  { href: "/versand", label: "Versand" },
] as const;

/** Dunkles Navy wie Admin-Sidebar; helle Schrift, Primärgrün für Links. */
export async function SiteFooter() {
  const settings = await getShopSettings();
  let shopLinks = buildStorefrontShopNavLinks([]);
  let merchandisingLinks: ReturnType<typeof resolveFooterMerchandisingLinks> = [];
  try {
    const categories = await listActiveCategoriesForNav();
    shopLinks = buildStorefrontShopNavLinks(
      categories.map((c) => ({ slug: c.slug, title: c.title })),
    );
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
  }
  try {
    const collections = await listActiveCollectionsForStorefront();
    merchandisingLinks = resolveFooterMerchandisingLinks(
      shopLinks,
      collections.filter((c) => c._count.products > 0).map((c) => ({ slug: c.slug, title: c.title })),
    );
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
  }

  /** Nur published CMS-Content-Seiten — Drafts nie (Epic 12 Slice 4). */
  let cmsContentLinks: Array<{ href: string; label: string }> = [];
  try {
    cmsContentLinks = await listPublishedContentNavLinks();
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
  }

  const tagline = shopFooterTagline(settings);
  const shopName = settings.shopName;
  const socialLinks = [
    settings.instagramUrl
      ? { href: settings.instagramUrl, label: "Instagram", Icon: Instagram }
      : null,
    settings.facebookUrl
      ? { href: settings.facebookUrl, label: "Facebook", Icon: Facebook }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item != null);

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#182d4d] py-12 text-center text-[0.98rem] leading-relaxed text-white/90 sm:py-14 sm:text-base">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-lg font-medium text-white sm:text-xl">{tagline}</p>
        {shopLinks.length > 0 ? (
          <nav
            className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] sm:text-base"
            aria-label="Shop"
          >
            {shopLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]"
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        {merchandisingLinks.length > 0 ? (
          <nav
            className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] text-white/80 sm:text-base"
            aria-label="Kollektionen"
          >
            {merchandisingLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]"
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        {cmsContentLinks.length > 0 ? (
          <nav
            className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] text-white/80 sm:text-base"
            aria-label="Inhalte"
          >
            {cmsContentLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]"
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        <nav
          className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] sm:text-base"
          aria-label="Rechtliches"
        >
          {legalLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]"
            >
              {label}
            </Link>
          ))}
          <CookieSettingsButton className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]" />
        </nav>
        {socialLinks.length > 0 ? (
          <nav
            className="mt-5 flex flex-wrap items-center justify-center gap-3"
            aria-label="Social Media"
          >
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-10 items-center justify-center rounded-sm text-primary transition-colors hover:text-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]"
                aria-label={label}
              >
                <Icon className="size-5" aria-hidden strokeWidth={1.75} />
              </a>
            ))}
          </nav>
        ) : null}
        <p className="mt-6 text-sm text-white/60 sm:text-base">
          © {new Date().getFullYear()} {shopName}
        </p>
      </div>
    </footer>
  );
}
