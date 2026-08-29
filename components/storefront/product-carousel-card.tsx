import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { ProductCardImageSlider } from "@/components/storefront/product-card-image-slider";
import { ProductCardImage } from "@/components/storefront/product-card-image";
import {
  pickDefaultVariant,
  quantityRulesFromVariant,
} from "@/lib/catalog/default-variant-storefront";
import { defaultAddQuantity } from "@/lib/cart/quantity";
import type { StorefrontProductCard } from "@/components/storefront/product-card";

const carouselImageSizes = "(min-width: 1024px) 28vw, (min-width: 768px) 40vw, 72vw";

/** Reduzierte Produktkarte fürs horizontale Karussell (Peek, kein Aktions-Fuß). */
export function ProductCarouselCard({ product }: { product: StorefrontProductCard }) {
  const variant = pickDefaultVariant(product);
  const quantityRules = variant ? quantityRulesFromVariant(variant) : null;
  const canAdd = quantityRules ? defaultAddQuantity(quantityRules) !== null : false;
  const displayPriceCents = variant?.priceGrossCents ?? 0;
  const listPriceCents = variant?.listPriceGrossCents ?? null;
  const onSale = listPriceCents != null && listPriceCents > displayPriceCents;
  const productHref = `/produkte/${product.slug}`;

  if (!variant) {
    return (
      <article className="text-sm text-(--foreground-muted)">
        <Link href={productHref} className="hover:text-(--foreground-heading)">
          {product.title}
        </Link>
        <span> — derzeit nicht bestellbar.</span>
      </article>
    );
  }

  return (
    <article className="flex min-h-full flex-col">
      <div className="relative overflow-hidden rounded-lg bg-(--surface-muted)">
        <Link
          href={productHref}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          {(onSale || product.isBestseller) && (
            <div className="pointer-events-none absolute left-2 top-2 z-30 flex flex-col gap-1">
              {onSale ? (
                <span className="inline-flex w-fit items-center rounded-sm bg-(--foreground-heading) px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white">
                  Sale
                </span>
              ) : null}
              {product.isBestseller ? (
                <span className="inline-flex w-fit items-center rounded-sm bg-primary px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white">
                  Bestseller
                </span>
              ) : null}
            </div>
          )}
          {product.images.length === 1 ? (
            <ProductCardImage
              url={product.images[0]!.url}
              alt={product.images[0]!.alt}
              productTitle={product.title}
              className="aspect-[4/5]"
              sizes={carouselImageSizes}
            />
          ) : (
            <ProductCardImageSlider
              images={product.images}
              productTitle={product.title}
              swipeOnly
            />
          )}
        </Link>
        {canAdd ? (
          <div className="absolute bottom-2 right-2 z-20">
            <AddToCartForm
              productId={product.id}
              productVariantId={variant.id}
              canAdd={canAdd}
              quantityRules={quantityRules!}
              layout="carousel-icon"
            />
          </div>
        ) : null}
      </div>
      <Link
        href={productHref}
        className="block pt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {product.subtitle?.trim() ? (
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-(--foreground-muted)">
            {product.subtitle}
          </p>
        ) : null}
        <h3 className="mt-1 text-sm leading-snug text-(--foreground-heading)">{product.title}</h3>
        <p className="mt-1 text-sm text-(--foreground-heading)">
          {onSale ? (
            <span className="mr-1.5 text-(--foreground-muted) line-through">
              {formatPrice(listPriceCents, product.currency)}
            </span>
          ) : null}
          {formatPrice(displayPriceCents, product.currency)}*
        </p>
      </Link>
    </article>
  );
}
