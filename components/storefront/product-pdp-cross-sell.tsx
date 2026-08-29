import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";
import { pickDefaultVariant } from "@/lib/catalog/default-variant-storefront";
import type { StorefrontProductCard } from "@/components/storefront/product-card";
import { StorefrontImage } from "@/components/storefront/storefront-image";

/**
 * Kompakte Produktempfehlungen unterhalb der PDP-Beschreibung.
 */
export function ProductPdpCrossSell({
  products,
  heading = "Das könnte dir auch gefallen",
}: {
  products: StorefrontProductCard[];
  heading?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section
      className="mt-8 border-t border-(--surface-muted) pt-8"
      aria-labelledby="pdp-cross-sell-heading"
    >
      <h2
        id="pdp-cross-sell-heading"
        className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary"
      >
        {heading}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {products.map((product) => {
          const variant = pickDefaultVariant(product);
          const price = variant ? formatPrice(variant.priceGrossCents, product.currency) : null;
          const image = product.images[0];

          return (
            <li key={product.id}>
              <Link
                href={`/produkte/${product.slug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-(--surface-muted) bg-white transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="relative aspect-square bg-(--surface-soft)">
                  {image ? (
                    <StorefrontImage
                      src={image.url}
                      alt={image.alt || product.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                      sizes="(min-width: 640px) 20vw, 45vw"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <p className="line-clamp-2 text-xs font-medium leading-snug text-(--foreground-heading)">
                    {product.title}
                  </p>
                  {price ? (
                    <p className="mt-1 text-sm font-semibold text-primary">{price}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
