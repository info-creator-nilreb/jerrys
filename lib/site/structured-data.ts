import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import { absoluteUrl, canonicalSiteOrigin } from "@/lib/site/canonical-origin";

export type BreadcrumbJsonLdItem = {
  label: string;
  /** Relative oder absolute URL; fehlend = aktuelle Seite (ohne `item`). */
  href?: string;
};

/** Stabile `@id` für Organization/OnlineStore (siteweit). */
export function organizationSchemaId(origin?: string): string {
  const base = (origin ?? canonicalSiteOrigin()).replace(/\/$/, "");
  return base ? `${base}/#organization` : "#organization";
}

/** Stabile `@id` für WebSite. */
export function websiteSchemaId(origin?: string): string {
  const base = (origin ?? canonicalSiteOrigin()).replace(/\/$/, "");
  return base ? `${base}/#website` : "#website";
}

/** Öffentliche Such-URL-Vorlage (Storefront: `/produkte?q=`). */
export function storefrontSearchUrlTemplate(origin?: string): string {
  const base = (origin ?? canonicalSiteOrigin()).replace(/\/$/, "");
  const path = "/produkte?q={search_term_string}";
  return base ? `${base}${path}` : path;
}

function postalAddressFromSettings(
  settings: Pick<
    ShopSettingsDTO,
    | "addressLine1"
    | "addressLine2"
    | "addressZip"
    | "addressCity"
    | "addressCountry"
  >,
): Record<string, unknown> | undefined {
  const street = [settings.addressLine1, settings.addressLine2?.trim()]
    .filter(Boolean)
    .join(", ");
  if (!street && !settings.addressZip && !settings.addressCity) {
    return undefined;
  }
  return {
    "@type": "PostalAddress",
    streetAddress: street || undefined,
    postalCode: settings.addressZip || undefined,
    addressLocality: settings.addressCity || undefined,
    addressCountry: settings.addressCountry || undefined,
  };
}

function sameAsFromSettings(
  settings: Pick<ShopSettingsDTO, "instagramUrl" | "facebookUrl">,
): string[] {
  return [settings.instagramUrl, settings.facebookUrl]
    .map((u) => u?.trim())
    .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)));
}

/**
 * Organization + OnlineStore aus ShopSettings (Epic 11 Branding/Kontakt).
 */
export function buildOrganizationOnlineStoreJsonLd(
  settings: ShopSettingsDTO,
  origin?: string,
): Record<string, unknown> {
  const base = (origin ?? canonicalSiteOrigin()).replace(/\/$/, "");
  const logoPath = resolveShopBrandingAssetUrl(settings, "logoLight");
  const logoUrl = absoluteUrl(logoPath);
  const address = postalAddressFromSettings(settings);
  const sameAs = sameAsFromSettings(settings);

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    "@id": organizationSchemaId(base),
    name: settings.shopName,
    legalName: settings.legalName || undefined,
    url: base || undefined,
    description: settings.shortDescription?.trim() || undefined,
    email: settings.contactEmail || undefined,
    telephone: settings.contactPhone || undefined,
    logo: logoUrl || undefined,
    image: logoUrl || undefined,
    vatID: settings.vatId || undefined,
  };

  if (address) node.address = address;
  if (sameAs.length) node.sameAs = sameAs;

  return node;
}

/**
 * WebSite inkl. SearchAction auf die Katalogsuche (`/produkte?q=`).
 */
export function buildWebSiteSearchActionJsonLd(
  settings: Pick<ShopSettingsDTO, "shopName" | "shortDescription">,
  origin?: string,
): Record<string, unknown> {
  const base = (origin ?? canonicalSiteOrigin()).replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteSchemaId(base),
    name: settings.shopName,
    url: base || undefined,
    description: settings.shortDescription?.trim() || undefined,
    inLanguage: "de-DE",
    publisher: { "@id": organizationSchemaId(base) },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: storefrontSearchUrlTemplate(base),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * BreadcrumbList aus Storefront-Brotkrümeln.
 * Letztes Element ohne `href` erhält kein `item` (aktuelle Seite).
 */
export function buildBreadcrumbListJsonLd(
  items: BreadcrumbJsonLdItem[],
): Record<string, unknown> | null {
  if (items.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const element: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
      };
      if (item.href) {
        element.item = absoluteUrl(item.href);
      }
      return element;
    }),
  };
}

export type ProductOfferJsonLdInput = {
  name: string;
  description: string | null | undefined;
  slug: string;
  sku?: string | null;
  priceGrossCents: number;
  currency: string;
  availableQuantity: number;
  images: Array<{ url: string; alt: string }>;
  aggregateRatingAverage?: number | null;
  aggregateRatingCount?: number | null;
};

/**
 * Product + Offer (PDP). Brand verweist auf die siteweite Organization-`@id`.
 */
export function buildProductOfferJsonLd(
  input: ProductOfferJsonLdInput,
): Record<string, unknown> {
  const productUrl = absoluteUrl(`/produkte/${input.slug}`);
  const imageUrls = input.images.map((i) => absoluteUrl(i.url)).filter(Boolean);
  const price = (input.priceGrossCents / 100).toFixed(2);
  const availability =
    input.availableQuantity > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const hasAggregate =
    input.aggregateRatingAverage != null &&
    input.aggregateRatingCount != null &&
    input.aggregateRatingCount > 0 &&
    input.aggregateRatingAverage >= 0 &&
    input.aggregateRatingAverage <= 5;

  const sku = input.sku?.trim();

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description?.trim() || undefined,
    sku: sku || undefined,
    image: imageUrls.length ? imageUrls : undefined,
    brand: {
      "@id": organizationSchemaId(),
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: input.currency,
      price,
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (hasAggregate) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRatingAverage,
      reviewCount: input.aggregateRatingCount,
    };
  }

  return jsonLd;
}
