import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { AmazonRatingDisplay } from "@/components/storefront/amazon-rating-display";
import { ProductCardImageSlider } from "@/components/storefront/product-card-image-slider";
import {
  pickDefaultVariant,
  quantityRulesFromVariant,
  type StorefrontVariantCommerce,
} from "@/lib/catalog/default-variant-storefront";
import { defaultAddQuantity } from "@/lib/cart/quantity";

export type StorefrontProductCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  isBestseller: boolean;
  currency: string;
  amazonRatingAverage: number | null;
  amazonRatingCount: number | null;
  amazonReviewUrl: string | null;
  images: { url: string; alt: string }[];
  variants: StorefrontVariantCommerce[];
};

export function ProductCard({ product }: { product: StorefrontProductCard }) {
  const variant = pickDefaultVariant(product);
  const quantityRules = variant ? quantityRulesFromVariant(variant) : null;
  const canAdd = quantityRules ? defaultAddQuantity(quantityRules) !== null : false;
  const displayPriceCents = variant?.priceGrossCents ?? 0;
  const listPriceCents = variant?.listPriceGrossCents ?? null;
  const onSale = listPriceCents != null && listPriceCents > displayPriceCents;

  if (!variant) {
    return (
      <article className="rounded-xl border border-(--surface-muted) bg-white p-6 text-sm text-(--foreground-muted)">
        {product.title} — derzeit nicht bestellbar.
      </article>
    );
  }

  return (
    <article className="group relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Link
          href={`/produkte/${product.slug}`}
          className="absolute inset-0 z-0 rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`${product.title} – zur Produktseite`}
        />
        <div className="relative z-10 shrink-0 pointer-events-auto">
          <div className="absolute left-3 top-3 z-30 flex flex-col gap-1.5">
            {onSale ? (
              <span className="inline-flex w-fit items-center rounded-full bg-(--foreground-heading) px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white shadow-sm">
                Sale
              </span>
            ) : null}
            {product.isBestseller ? (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white shadow-sm">
                Bestseller
              </span>
            ) : null}
          </div>
          <ProductCardImageSlider images={product.images} productTitle={product.title} />
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col pointer-events-none p-6 md:p-7">
          <div className="min-h-0 flex-1">
            <h3 className="text-xl font-semibold text-(--foreground-heading) md:text-2xl">{product.title}</h3>
            {product.subtitle ? (
              <p className="mt-2 text-base leading-snug text-(--foreground-muted) md:text-[1.05rem]">
                {product.subtitle}
              </p>
            ) : null}
            <div className="mt-3 shrink-0 md:min-h-[3.75rem]">
              {product.amazonRatingAverage != null && product.amazonRatingCount != null ? (
                <AmazonRatingDisplay
                  compact
                  className="mt-0"
                  average={product.amazonRatingAverage}
                  count={product.amazonRatingCount}
                  reviewUrl={product.amazonReviewUrl}
                />
              ) : null}
            </div>
            <p className="mt-4 text-lg font-semibold text-primary md:text-xl">
              {onSale ? (
                <span className="mr-2 font-normal text-(--foreground-muted) line-through">
                  {formatPrice(listPriceCents, product.currency)}
                </span>
              ) : null}
              {formatPrice(displayPriceCents, product.currency)}*
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col justify-start border-t border-(--surface-muted) bg-white px-6 pt-4 pb-6 md:min-h-[8.5rem] md:px-7 md:pb-7">
        <AddToCartForm
          productId={product.id}
          productVariantId={variant.id}
          canAdd={canAdd}
          quantityRules={quantityRules!}
          compact
        />
      </div>
    </article>
  );
}
