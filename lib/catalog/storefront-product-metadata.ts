import type { Metadata } from "next";
import type { ProductOfferJsonLdInput } from "@/lib/site/structured-data";
import {
  buildStorefrontMetadata,
  htmlToPlainTextPreview,
} from "@/lib/site/storefront-metadata";

export type StorefrontProductMetadataSource = {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  leadText: string | null;
  currency: string;
  images: Array<{ url: string; alt: string }>;
  defaultVariant: {
    sku: string;
    priceGrossCents: number;
    availableQuantity: number;
  };
  amazonRatingAverage: number | null;
  amazonRatingCount: number | null;
};

export function resolveProductDescription(source: StorefrontProductMetadataSource): string | undefined {
  return (
    source.leadText?.trim() ||
    source.subtitle?.trim() ||
    htmlToPlainTextPreview(source.description)
  );
}

export function metadataForProduct(source: StorefrontProductMetadataSource): Metadata {
  const description = resolveProductDescription(source);
  const cover = source.images[0];

  return buildStorefrontMetadata({
    title: source.title,
    description,
    path: `/produkte/${source.slug}`,
    openGraphType: "product",
    images: cover ? [{ url: cover.url, alt: cover.alt || source.title }] : undefined,
  });
}

export function productOfferJsonLdInputFromProduct(
  source: StorefrontProductMetadataSource,
): ProductOfferJsonLdInput {
  return {
    name: source.title,
    description: resolveProductDescription(source),
    slug: source.slug,
    sku: source.defaultVariant.sku,
    priceGrossCents: source.defaultVariant.priceGrossCents,
    currency: source.currency,
    availableQuantity: source.defaultVariant.availableQuantity,
    images: source.images.map((i) => ({ url: i.url, alt: i.alt })),
    aggregateRatingAverage: source.amazonRatingAverage,
    aggregateRatingCount: source.amazonRatingCount,
  };
}
