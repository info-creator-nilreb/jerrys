"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ProductCard, type StorefrontProductCard } from "@/components/storefront/product-card";
import { usePrefersReducedMotion } from "@/components/storefront/use-prefers-reduced-motion";

export type ProductCarouselVariant = "compact" | "featured";

type ProductCarouselProps = {
  products: StorefrontProductCard[];
  variant?: ProductCarouselVariant;
  ariaLabel?: string;
  className?: string;
};

const slideClassByVariant: Record<ProductCarouselVariant, string> = {
  compact:
    "min-w-0 shrink-0 grow-0 basis-full pl-0 sm:basis-[calc(50%-0.75rem)] sm:pl-3 lg:basis-[calc(33.333%-1rem)] lg:pl-4",
  featured:
    "mx-auto min-w-0 max-w-lg shrink-0 grow-0 basis-full pl-0 md:mx-0 md:basis-[calc(50%-1.25rem)] md:pl-5",
};

const navBtnClass =
  "absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-(--surface-muted) bg-white/95 text-(--foreground-heading) shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40";

function ProductCarouselStack({
  products,
  className,
}: {
  products: StorefrontProductCard[];
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className ?? ""}`.trim()}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} layout="carousel" />
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
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const raf = requestAnimationFrame(() => {
      onSelect();
    });
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      cancelAnimationFrame(raf);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const slideClass = slideClassByVariant[variant];
  const showNav = products.length > 1;

  return (
    <div className={className}>
      <div className="relative">
        {showNav ? (
          <>
            <button
              type="button"
              className={`${navBtnClass} left-0 sm:left-1`}
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              aria-label="Vorheriges Produkt"
            >
              <ChevronLeft width={18} height={18} aria-hidden strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${navBtnClass} right-0 sm:right-1`}
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              aria-label="Nächstes Produkt"
            >
              <ChevronRight width={18} height={18} aria-hidden strokeWidth={2} />
            </button>
          </>
        ) : null}
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
          <div className="flex touch-pan-y">
            {products.map((product, slideIndex) => (
              <div
                key={product.id}
                className={`flex h-full min-h-0 flex-col self-stretch ${slideClass}`}
                role="group"
                aria-roledescription="Folie"
                aria-label={`Produkt ${slideIndex + 1} von ${products.length}`}
              >
                <ProductCard product={product} layout="carousel" />
              </div>
            ))}
          </div>
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
  const wrapperClass =
    className ??
    "mx-auto flex w-full max-w-lg justify-center";

  return (
    <div className={wrapperClass}>
      <ProductCard product={product} layout="carousel" />
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
        className={variant === "featured" ? "mx-auto flex w-full max-w-lg justify-center" : className}
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const raf = requestAnimationFrame(onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      cancelAnimationFrame(raf);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (items.length === 0) return null;

  if (items.length === 1) {
    return <div className={className}>{renderItem(items[0]!, 0)}</div>;
  }

  return (
    <div className={`relative ${className ?? ""}`.trim()}>
      <button
        type="button"
        className={`${navBtnClass} left-0 h-8 w-8`}
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!canPrev}
        aria-label="Zurück"
      >
        <ChevronLeft width={16} height={16} aria-hidden strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`${navBtnClass} right-0 h-8 w-8`}
        onClick={() => emblaApi?.scrollNext()}
        disabled={!canNext}
        aria-label="Weiter"
      >
        <ChevronRight width={16} height={16} aria-hidden strokeWidth={2} />
      </button>
      <div ref={emblaRef} className="overflow-hidden px-8">
        <div className="flex">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="min-w-0 shrink-0 grow-0 basis-[min(100%,14rem)] pl-0 sm:basis-[calc(50%-0.375rem)] sm:pl-1.5"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
