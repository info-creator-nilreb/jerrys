import { absoluteUrl } from "@/lib/site/canonical-origin";

type Image = { url: string; alt: string };

type Props = {
  name: string;
  description: string | null | undefined;
  slug: string;
  priceGrossCents: number;
  currency: string;
  availableQuantity: number;
  images: Image[];
  /** Optional: manuell gepflegte Amazon-Sterne für schema.org AggregateRating. */
  aggregateRatingAverage?: number | null;
  aggregateRatingCount?: number | null;
};

export function ProductJsonLd({
  name,
  description,
  slug,
  priceGrossCents,
  currency,
  availableQuantity,
  images,
  aggregateRatingAverage,
  aggregateRatingCount,
}: Props) {
  const productUrl = absoluteUrl(`/produkte/${slug}`);
  const imageUrls = images.map((i) => absoluteUrl(i.url)).filter(Boolean);
  const price = (priceGrossCents / 100).toFixed(2);
  const availability =
    availableQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  const hasAggregate =
    aggregateRatingAverage != null &&
    aggregateRatingCount != null &&
    aggregateRatingCount > 0 &&
    aggregateRatingAverage >= 0 &&
    aggregateRatingAverage <= 5;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description?.trim() || undefined,
    image: imageUrls.length ? imageUrls : undefined,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: currency,
      price,
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (hasAggregate) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRatingAverage,
      reviewCount: aggregateRatingCount,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
