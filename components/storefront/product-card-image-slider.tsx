"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { StorefrontImage } from "@/components/storefront/storefront-image";

type Slide = { url: string; alt: string };

export function ProductCardImageSlider({
  images,
  productTitle,
  /** Nur Wischen — keine Pfeile/Punkte (Karussell-Karten). */
  swipeOnly = false,
}: {
  images: Slide[];
  /** Für Barrierefreiheit (Karussell-Beschriftung). */
  productTitle: string;
  swipeOnly?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const n = images.length;
  const last = Math.max(0, n - 1);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => {
        const next = i + dir;
        if (next < 0) return last;
        if (next > last) return 0;
        return next;
      });
    },
    [last, n],
  );

  const onTouchStart = swipeOnly
    ? undefined
    : (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      };

  const onTouchEnd = swipeOnly
    ? undefined
    : (e: React.TouchEvent) => {
        if (touchStartX.current === null || n <= 1) return;
        const endX = e.changedTouches[0]?.clientX;
        if (endX === undefined) return;
        const dx = endX - touchStartX.current;
        if (dx > 48) go(-1);
        else if (dx < -48) go(1);
        touchStartX.current = null;
      };

  if (n === 0) {
    return (
      <div className="flex aspect-square items-center justify-center text-sm text-(--foreground-muted)">
        Kein Bild
      </div>
    );
  }

  const label = `Bildergalerie: ${productTitle}`;

  return (
    <div
      className={`relative bg-(--surface-muted) ${swipeOnly ? "aspect-[4/5]" : "aspect-square"}`}
      role="region"
      aria-roledescription="Karussell"
      aria-label={label}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {images.map((img, i) => (
        <StorefrontImage
          key={`${img.url}-${i}`}
          src={img.url}
          alt={img.alt || productTitle}
          fill
          className={`object-cover transition-opacity duration-300 ease-out ${
            i === index ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
          }`}
          sizes={swipeOnly ? "(min-width: 1024px) 28vw, (min-width: 768px) 40vw, 72vw" : "(min-width:768px) 50vw, 100vw"}
          priority={i === 0}
        />
      ))}

      {n > 1 && !swipeOnly ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Vorheriges Bild"
              className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <ChevronLeft className="size-5" aria-hidden strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(1);
              }}
              aria-label="Nächstes Bild"
              className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <ChevronRight className="size-5" aria-hidden strokeWidth={2.25} />
            </button>
          </div>
          <nav
            className="absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1.5 px-2"
            aria-label="Bildauswahl"
          >
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-current={i === index ? "true" : undefined}
                aria-label={`Bild ${i + 1} von ${n}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`size-2 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  i === index ? "bg-primary" : "bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </nav>
        </>
      ) : null}
    </div>
  );
}
