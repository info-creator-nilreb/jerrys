import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { AmazonRatingDisplay } from "@/components/storefront/amazon-rating-display";
import { ProductCardImageSlider } from "@/components/storefront/product-card-image-slider";
import { ProductCardImage } from "@/components/storefront/product-card-image";
import {
  pickDefaultVariant,
  quantityRulesFromVariant,
  type StorefrontVariantCommerce,
} from "@/lib/catalog/default-variant-storefront";
import { defaultAddQuantity } from "@/lib/cart/quantity";
import { PRODUCT_CARD_COMPACT_ACTION_CLASS } from "@/components/storefront/product-card-layout";

export type StorefrontProductCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  createdAt?: Date | string;
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
  const productHref = `/produkte/${product.slug}`;

  if (!variant) {
    return (
      <article className="rounded-xl border border-(--surface-muted) bg-white p-6 text-sm text-(--foreground-muted)">
        {product.title} — derzeit nicht bestellbar.
      </article>
    );
  }

  const hasAmazonRating =
    product.amazonRatingAverage != null && product.amazonRatingCount != null;

  return (
    <article className="group relative flex min-h-full flex-1 flex-col overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={productHref}
        className="relative flex min-h-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        <div className="relative shrink-0">
          <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-col gap-1.5">
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
          {product.images.length === 1 ? (
            <ProductCardImage
              url={product.images[0]!.url}
              alt={product.images[0]!.alt}
              productTitle={product.title}
            />
          ) : (
            <ProductCardImageSlider images={product.images} productTitle={product.title} />
          )}
        </div>
        <div className="flex flex-col p-6 md:p-7">
          <h3 className="text-xl font-semibold text-(--foreground-heading) md:text-2xl">
            {product.title}
          </h3>
          {product.subtitle?.trim() ? (
            <p className="mt-2 text-base leading-snug text-(--foreground-muted) md:text-[1.05rem]">
              {product.subtitle}
            </p>
          ) : null}
          {hasAmazonRating ? (
            <div className="mt-3 shrink-0">
              <AmazonRatingDisplay
                compact
                className="mt-0"
                average={product.amazonRatingAverage!}
                count={product.amazonRatingCount!}
                reviewUrl={product.amazonReviewUrl}
              />
            </div>
          ) : null}
          <p
            className={`${
              product.subtitle?.trim() || hasAmazonRating ? "mt-3" : "mt-2"
            } text-lg font-semibold text-primary md:text-xl`}
          >
            {onSale ? (
              <span className="mr-2 font-normal text-(--foreground-muted) line-through">
                {formatPrice(listPriceCents, product.currency)}
              </span>
            ) : null}
            {formatPrice(displayPriceCents, product.currency)}*
          </p>
        </div>
      </Link>
      <div className="relative z-10 shrink-0 border-t border-(--surface-muted) bg-white px-6 pt-4 pb-6 md:px-7 md:pb-7">
        <div className={PRODUCT_CARD_COMPACT_ACTION_CLASS}>
          <AddToCartForm
            productId={product.id}
            productVariantId={variant.id}
            canAdd={canAdd}
            quantityRules={quantityRules!}
            compact
          />
        </div>
      </div>
    </article>
  );
}
