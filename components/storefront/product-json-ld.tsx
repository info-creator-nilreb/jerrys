import { absoluteUrl } from "@/lib/site/canonical-origin";

type Image = { url: string; alt: string };

type Props = {
  name: string;
  description: string | null | undefined;
  slug: string;
  priceGrossCents: number;
  currency: string;
  stockQuantity: number;
  images: Image[];
};

export function ProductJsonLd({ name, description, slug, priceGrossCents, currency, stockQuantity, images }: Props) {
  const productUrl = absoluteUrl(`/produkte/${slug}`);
  const imageUrls = images.map((i) => absoluteUrl(i.url)).filter(Boolean);
  const price = (priceGrossCents / 100).toFixed(2);
  const availability =
    stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  const jsonLd = {
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
