"use client";

import useEmblaCarousel from "embla-carousel-react";
import { type ReactNode } from "react";
import { ProductCarouselCard } from "@/components/storefront/product-carousel-card";
import type { StorefrontProductCard } from "@/components/storefront/product-card";
import { usePrefersReducedMotion } from "@/components/storefront/use-prefers-reduced-motion";
import { emblaInteractiveDragOptions } from "@/lib/storefront/embla-interactive-drag";

export type ProductCarouselVariant = "compact" | "featured";

type ProductCarouselProps = {
  products: StorefrontProductCard[];
  variant?: ProductCarouselVariant;
  ariaLabel?: string;
  className?: string;
};

const slideClassByVariant: Record<ProductCarouselVariant, string> = {
  compact:
    "min-w-0 shrink-0 grow-0 basis-[68%] pr-3 sm:basis-[calc(50%-0.375rem)] sm:pr-4 md:basis-[calc(42%-0.5rem)] lg:basis-[calc(32%-0.625rem)] lg:pr-4",
  featured:
    "min-w-0 shrink-0 grow-0 basis-[68%] pr-3 sm:basis-[calc(50%-0.375rem)] sm:pr-4 md:basis-[calc(42%-0.5rem)] lg:basis-[calc(36%-0.625rem)] lg:pr-4",
};

function ProductCarouselStack({
  products,
  className,
}: {
  products: StorefrontProductCard[];
  className?: string;
}) {
  return (
    <div className={`space-y-8 ${className ?? ""}`.trim()}>
      {products.map((product) => (
        <ProductCarouselCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCarouselEmbla({
  products,
  variant,
  ariaLabel,
  className,
}: Required<Pick<ProductCarouselProps, "products" | "variant" | "ariaLabel">> &
  Pick<ProductCarouselProps, "className">) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    duration: 22,
    align: "start",
    containScroll: "trimSnaps",
    ...emblaInteractiveDragOptions,
  });

  const slideClass = slideClassByVariant[variant];

  return (
    <div className={className}>
      <div
        ref={emblaRef}
        className="overflow-hidden outline-none ring-primary focus-visible:ring-2"
        tabIndex={0}
        role="region"
        aria-roledescription="Karussell"
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            emblaApi?.scrollPrev();
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            emblaApi?.scrollNext();
          }
        }}
      >
        <div className="flex items-stretch touch-pan-y">
          {products.map((product, slideIndex) => (
            <div
              key={product.id}
              className={`flex min-h-full flex-col self-stretch ${slideClass}`}
              role="group"
              aria-roledescription="Folie"
              aria-label={`Produkt ${slideIndex + 1} von ${products.length}`}
            >
              <ProductCarouselCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCarouselSingle({
  product,
  className,
}: {
  product: StorefrontProductCard;
  className?: string;
}) {
  const wrapperClass = className ?? "mx-auto flex w-full max-w-xs justify-center";

  return (
    <div className={wrapperClass}>
      <ProductCarouselCard product={product} />
    </div>
  );
}

export function ProductCarousel({
  products,
  variant = "compact",
  ariaLabel = "Produkte",
  className,
}: ProductCarouselProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (products.length === 0) return null;

  if (products.length === 1) {
    return (
      <ProductCarouselSingle
        product={products[0]!}
        className={variant === "featured" ? "mx-auto flex w-full max-w-xs justify-center" : className}
      />
    );
  }

  if (reducedMotion) {
    return <ProductCarouselStack products={products} className={className} />;
  }

  return (
    <ProductCarouselEmbla
      products={products}
      variant={variant}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}

/** Kompakte horizontale Vorschau für Admin-Live-Preview (ohne volle ProductCard). */
export function ProductCarouselPreview<T extends { id: string }>({
  items,
  renderItem,
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  const [emblaRef] = useEmblaCarousel({
    loop: false,
    align: "start",
    containScroll: "trimSnaps",
    ...emblaInteractiveDragOptions,
  });

  if (items.length === 0) return null;

  if (items.length === 1) {
    return <div className={className}>{renderItem(items[0]!, 0)}</div>;
  }

  return (
    <div className={className}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="min-w-0 shrink-0 grow-0 basis-[68%] pr-3 sm:basis-[calc(50%-0.375rem)] sm:pr-4"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
