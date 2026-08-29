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

type ProductCardLayout = "default" | "carousel";

const CAROUSEL_FOOTER_MIN_H = "min-h-[7.75rem]";
const CAROUSEL_RATING_MIN_H = "min-h-[3.75rem]";

export function ProductCard({
  product,
  layout = "default",
}: {
  product: StorefrontProductCard;
  /** Karussell: einheitliche Kartenhöhe trotz fehlendem Warenkorb-Bereich. */
  layout?: ProductCardLayout;
}) {
  const variant = pickDefaultVariant(product);
  const quantityRules = variant ? quantityRulesFromVariant(variant) : null;
  const canAdd = quantityRules ? defaultAddQuantity(quantityRules) !== null : false;
  const displayPriceCents = variant?.priceGrossCents ?? 0;
  const listPriceCents = variant?.listPriceGrossCents ?? null;
  const onSale = listPriceCents != null && listPriceCents > displayPriceCents;
  const productHref = `/produkte/${product.slug}`;
  const isCarousel = layout === "carousel";

  if (!variant && !isCarousel) {
    return (
      <article className="rounded-xl border border-(--surface-muted) bg-white p-6 text-sm text-(--foreground-muted)">
        {product.title} — derzeit nicht bestellbar.
      </article>
    );
  }

  const hasAmazonRating =
    product.amazonRatingAverage != null && product.amazonRatingCount != null;
  const showAmazonSlot = isCarousel || hasAmazonRating;

  return (
    <article className="group relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-sm transition-shadow hover:shadow-md">
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
          ) : product.images.length > 1 ? (
            <ProductCardImageSlider images={product.images} productTitle={product.title} />
          ) : (
            <div className="aspect-[4/3] w-full bg-(--surface-soft)" aria-hidden />
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-6 md:p-7">
          <h3 className="text-xl font-semibold text-(--foreground-heading) md:text-2xl">
            {product.title}
          </h3>
          {product.subtitle?.trim() || isCarousel ? (
            <p
              className={`mt-2 text-base leading-snug text-(--foreground-muted) md:text-[1.05rem] ${
                isCarousel ? "min-h-[2.75rem] md:min-h-[3rem]" : ""
              }`}
            >
              {product.subtitle?.trim() ? product.subtitle : "\u00a0"}
            </p>
          ) : null}
          {showAmazonSlot ? (
            <div
              className={`mt-3 shrink-0 ${isCarousel ? CAROUSEL_RATING_MIN_H : ""}`}
            >
              {hasAmazonRating ? (
                <AmazonRatingDisplay
                  compact
                  className="mt-0"
                  average={product.amazonRatingAverage!}
                  count={product.amazonRatingCount!}
                  reviewUrl={product.amazonReviewUrl}
                />
              ) : null}
            </div>
          ) : null}
          {variant ? (
            <p
              className={`${
                product.subtitle?.trim() || showAmazonSlot ? "mt-3" : "mt-2"
              } text-lg font-semibold text-primary md:text-xl`}
            >
              {onSale ? (
                <span className="mr-2 font-normal text-(--foreground-muted) line-through">
                  {formatPrice(listPriceCents, product.currency)}
                </span>
              ) : null}
              {formatPrice(displayPriceCents, product.currency)}*
            </p>
          ) : (
            <p className="mt-3 text-base text-(--foreground-muted)">
              Derzeit nicht bestellbar.
            </p>
          )}
        </div>
      </Link>
      <div
        className={`relative z-10 flex shrink-0 flex-col justify-end border-t border-(--surface-muted) bg-white px-6 pt-4 pb-6 md:px-7 md:pb-7 ${
          isCarousel ? CAROUSEL_FOOTER_MIN_H : ""
        }`}
      >
        {variant && quantityRules ? (
          <AddToCartForm
            productId={product.id}
            productVariantId={variant.id}
            canAdd={canAdd}
            quantityRules={quantityRules}
            compact
          />
        ) : (
          <p className="text-base leading-snug text-(--foreground-muted)">
            Derzeit nicht bestellbar (Lager oder Mindestabnahme).
          </p>
        )}
      </div>
    </article>
  );
}
