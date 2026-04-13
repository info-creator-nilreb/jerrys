import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { AmazonRatingDisplay } from "@/components/storefront/amazon-rating-display";
import { ProductCardImageSlider } from "@/components/storefront/product-card-image-slider";
import { defaultAddQuantity, type ProductQuantityRules } from "@/lib/cart/quantity";

export type StorefrontProductCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  isBestseller: boolean;
  priceGrossCents: number;
  currency: string;
  availableQuantity: number;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
  amazonRatingAverage: number | null;
  amazonRatingCount: number | null;
  amazonReviewUrl: string | null;
  images: { url: string; alt: string }[];
};

export function ProductCard({ product }: { product: StorefrontProductCard }) {
  const quantityRules: ProductQuantityRules = {
    availableQuantity: product.availableQuantity,
    minOrderQty: product.minOrderQty,
    purchaseStep: product.purchaseStep,
    maxOrderQty: product.maxOrderQty,
  };
  const canAdd = defaultAddQuantity(quantityRules) !== null;

  return (
    <article className="group relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Link
          href={`/produkte/${product.slug}`}
          className="absolute inset-0 z-0 rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`${product.title} – zur Produktseite`}
        />
        <div className="relative z-10 shrink-0 pointer-events-auto">
          {product.isBestseller ? (
            <span className="absolute left-3 top-3 z-30 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white shadow-sm">
              Bestseller
            </span>
          ) : null}
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
              {formatPrice(product.priceGrossCents, product.currency)}*
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col justify-start border-t border-(--surface-muted) bg-white px-6 pt-4 pb-6 md:min-h-[8.5rem] md:px-7 md:pb-7">
        <AddToCartForm productId={product.id} canAdd={canAdd} quantityRules={quantityRules} compact />
      </div>
    </article>
  );
}
