import type { CSSProperties } from "react";
import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/storefront/cookie-consent/cookie-settings-button";
import { listActiveCategoriesForNav } from "@/lib/catalog/category-queries";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import { listPublishedContentNavLinks } from "@/lib/content/content-public-discovery";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { resolveFooterLegalLinks } from "@/lib/shop/footer-settings";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { shopFooterTagline, shopFooterBgColor } from "@/lib/shop/storefront-branding";
import {
  buildStorefrontShopNavLinks,
  resolveFooterMerchandisingLinks,
} from "@/lib/storefront/shop-nav-links";

function isFooterDataLoadError(e: unknown): boolean {
  return isDatabaseUnreachable(e) || isMissingSchemaError(e);
}

async function loadFooterCategories() {
  try {
    return await listActiveCategoriesForNav();
  } catch (e) {
    if (!isFooterDataLoadError(e)) throw e;
    return [];
  }
}

async function loadFooterCollections() {
  try {
    return await listActiveCollectionsForStorefront();
  } catch (e) {
    if (!isFooterDataLoadError(e)) throw e;
    return [];
  }
}

async function loadFooterCmsLinks() {
  try {
    return await listPublishedContentNavLinks({ footerOnly: true });
  } catch (e) {
    if (!isFooterDataLoadError(e)) throw e;
    return [];
  }
}

/** Dunkles Navy wie Admin-Sidebar; helle Schrift, Primärgrün für Links. */
export async function SiteFooter() {
  const settings = await getShopSettings();

  const [categories, collections, cmsContentLinks] = await Promise.all([
    loadFooterCategories(),
    loadFooterCollections(),
    loadFooterCmsLinks(),
  ]);

  const navOptions = {
    showAllProducts: settings.showAllProductsInNav,
    showTermine: settings.showTermineInNav,
  };
  const shopLinks = buildStorefrontShopNavLinks(
    categories.map((c) => ({ slug: c.slug, title: c.title })),
    navOptions,
  );
  const merchandisingLinks = resolveFooterMerchandisingLinks(
    shopLinks,
    collections
      .filter((c) => c._count.products > 0)
      .map((c) => ({ slug: c.slug, title: c.title })),
  );

  const tagline = shopFooterTagline(settings);
  const shopName = settings.shopName;
  const footerBg = shopFooterBgColor(settings);
  const footerFocusStyle = { "--tw-ring-offset-color": footerBg } as CSSProperties;
  const legalLinks = resolveFooterLegalLinks(settings);
  const socialLinks = [
    settings.instagramUrl
      ? { href: settings.instagramUrl, label: "Instagram", Icon: Instagram }
      : null,
    settings.facebookUrl
      ? { href: settings.facebookUrl, label: "Facebook", Icon: Facebook }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item != null);

  const showShopNav = settings.footerShowShopNav && shopLinks.length > 0;
  const showCollections =
    settings.footerShowCollections && merchandisingLinks.length > 0;
  const showCms = settings.footerShowCmsLinks && cmsContentLinks.length > 0;
  const showSocial = settings.footerShowSocial && socialLinks.length > 0;

  return (
    <footer
      className="mt-auto border-t border-white/10 py-12 text-center text-[0.98rem] leading-relaxed text-white/90 sm:py-14 sm:text-base"
      style={{ backgroundColor: footerBg }}
    >
      <div className="mx-auto max-w-6xl px-4">
        {settings.footerShowTagline ? (
          <p className="text-lg font-medium text-white sm:text-xl">{tagline}</p>
        ) : null}
        {showShopNav ? (
          <nav
            className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] sm:text-base ${settings.footerShowTagline ? "mt-5" : ""}`}
            aria-label="Shop"
          >
            {shopLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={footerFocusStyle}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        {showCollections ? (
          <nav
            className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] text-white/80 sm:text-base"
            aria-label="Kollektionen"
          >
            {merchandisingLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={footerFocusStyle}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        {showCms ? (
          <nav
            className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] text-white/80 sm:text-base"
            aria-label="Inhalte"
          >
            {cmsContentLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={footerFocusStyle}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
        <nav
          className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] sm:text-base ${settings.footerShowTagline || showShopNav || showCollections || showCms ? "mt-4" : ""}`}
          aria-label="Rechtliches"
        >
          {legalLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={footerFocusStyle}
            >
              {label}
            </Link>
          ))}
          <CookieSettingsButton
            className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={footerFocusStyle}
          />
        </nav>
        {showSocial ? (
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
                className="inline-flex size-10 items-center justify-center rounded-sm text-primary transition-colors hover:text-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={footerFocusStyle}
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
