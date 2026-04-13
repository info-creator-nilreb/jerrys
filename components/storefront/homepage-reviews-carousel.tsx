"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/storefront/use-prefers-reduced-motion";

export type HomepageReviewSlide = {
  id: string;
  quote: string;
  rating: number;
  headline: string | null;
  author: string | null;
  sourceUrl: string | null;
};

function StarRow({ rating }: { rating: number }) {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  const filled = "★".repeat(n);
  const empty = "☆".repeat(5 - n);
  return (
    <p className="text-lg text-amber-500" aria-label={`${n} von 5 Sternen`}>
      <span aria-hidden>{filled}</span>
      <span className="text-amber-200" aria-hidden>
        {empty}
      </span>
    </p>
  );
}

function ReviewCard({ r }: { r: HomepageReviewSlide }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-(--surface-muted) bg-white p-6 shadow-sm">
      <StarRow rating={r.rating} />
      {r.headline ? (
        <h3 className="mt-2 text-base font-semibold text-(--foreground-heading)">{r.headline}</h3>
      ) : null}
      <blockquote className="mt-3 flex-1 text-base leading-relaxed text-(--foreground-muted)">
        <p className="whitespace-pre-wrap">{r.quote}</p>
      </blockquote>
      {r.author ? <footer className="mt-4 text-sm text-(--foreground-muted)">— {r.author}</footer> : null}
      {r.sourceUrl ? (
        <p className="mt-3">
          <a
            href={r.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Quelle bei Amazon
          </a>
        </p>
      ) : null}
    </article>
  );
}

function ReviewsStack({ reviews }: { reviews: HomepageReviewSlide[] }) {
  return (
    <div className="mt-10 space-y-8">
      {reviews.map((r) => (
        <ReviewCard key={r.id} r={r} />
      ))}
    </div>
  );
}

function ReviewsEmbla({ reviews }: { reviews: HomepageReviewSlide[] }) {
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
    <div className="mt-8 md:mt-10">
      <div className="relative">
        {reviews.length > 1 ? (
          <>
            <button
              type="button"
              className={`${navBtnClass} left-1 sm:left-2`}
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              aria-label="Vorherige Kundenstimme"
            >
              <ChevronLeft width={18} height={18} aria-hidden strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${navBtnClass} right-1 sm:right-2`}
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              aria-label="Nächste Kundenstimme"
            >
              <ChevronRight width={18} height={18} aria-hidden strokeWidth={2} />
            </button>
          </>
        ) : null}
        <div
          ref={emblaRef}
          className="overflow-hidden rounded-xl outline-none ring-primary focus-visible:ring-2"
          tabIndex={0}
          role="region"
          aria-roledescription="Karussell"
          aria-label="Kundenstimmen"
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
            {reviews.map((r, slideIndex) => (
              <div
                key={r.id}
                className="min-w-0 shrink-0 grow-0 basis-[min(100%,22rem)] pl-0 sm:basis-[min(100%,24rem)] sm:pl-4 md:basis-[42%] lg:basis-[38%]"
                role="group"
                aria-roledescription="Folie"
                aria-label={`Bewertung ${slideIndex + 1} von ${reviews.length}`}
              >
                <ReviewCard r={r} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomepageReviewsCarousel({ reviews }: { reviews: HomepageReviewSlide[] }) {
  const reducedMotion = usePrefersReducedMotion();

  if (reviews.length === 0) return null;

  if (reducedMotion) {
    return <ReviewsStack reviews={reviews} />;
  }

  return <ReviewsEmbla reviews={reviews} />;
}
