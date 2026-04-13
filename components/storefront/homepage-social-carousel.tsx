"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/storefront/use-prefers-reduced-motion";

export type HomepageSocialSlide = {
  id: string;
  url: string;
  alt: string;
  href: string | null;
};

function SocialSlide({ item }: { item: HomepageSocialSlide }) {
  const inner = (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-(--surface-muted) bg-(--surface-soft) shadow-sm">
      <Image src={item.url} alt={item.alt} fill className="object-cover" sizes="(max-width:768px)85vw,320px" />
    </div>
  );

  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className="block outline-none ring-primary focus-visible:ring-2">
        {inner}
      </a>
    );
  }

  return inner;
}

const slideSlotClass = "w-64 shrink-0 sm:w-72 lg:w-80";

function SocialGrid({ items }: { items: HomepageSocialSlide[] }) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-5 md:mt-10 md:gap-6">
      {items.map((item) => (
        <div key={item.id} className={slideSlotClass}>
          <SocialSlide item={item} />
        </div>
      ))}
    </div>
  );
}

function SocialEmbla({ items }: { items: HomepageSocialSlide[] }) {
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

  const navBtnClass =
    "absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-(--surface-muted) bg-white/95 text-(--foreground-heading) shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="relative mt-8 w-full md:mt-10">
      {items.length > 1 ? (
        <>
          <button
            type="button"
            className={`${navBtnClass} left-1 sm:left-2`}
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Vorheriges Bild"
          >
            <ChevronLeft width={18} height={18} aria-hidden strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`${navBtnClass} right-1 sm:right-2`}
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Nächstes Bild"
          >
            <ChevronRight width={18} height={18} aria-hidden strokeWidth={2} />
          </button>
        </>
      ) : null}
      <div
        ref={emblaRef}
        className="flex w-full justify-center overflow-hidden rounded-xl outline-none ring-primary focus-visible:ring-2"
        tabIndex={0}
        role="region"
        aria-roledescription="Karussell"
        aria-label="Bilder von Instagram"
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
        <div className="flex w-max touch-pan-y gap-4 sm:gap-5 md:gap-6">
          {items.map((item, slideIndex) => (
            <div
              key={item.id}
              className={slideSlotClass}
              role="group"
              aria-roledescription="Folie"
              aria-label={`Bild ${slideIndex + 1} von ${items.length}`}
            >
              <SocialSlide item={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomepageSocialCarousel({ items }: { items: HomepageSocialSlide[] }) {
  const reducedMotion = usePrefersReducedMotion();

  if (items.length === 0) return null;

  if (items.length === 1) {
    return (
      <div className="mt-8 flex justify-center md:mt-10">
        <div className={slideSlotClass}>
          <SocialSlide item={items[0]!} />
        </div>
      </div>
    );
  }

  if (reducedMotion) {
    return <SocialGrid items={items} />;
  }

  return <SocialEmbla items={items} />;
}
