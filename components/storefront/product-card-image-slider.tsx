"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

type Slide = { url: string; alt: string };

export function ProductCardImageSlider({
  images,
  productTitle,
}: {
  images: Slide[];
  /** Für Barrierefreiheit (Karussell-Beschriftung). */
  productTitle: string;
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

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
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
      className="relative aspect-square bg-(--surface-muted)"
      role="region"
      aria-roledescription="Karussell"
      aria-label={label}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {images.map((img, i) => (
        <Image
          key={`${img.url}-${i}`}
          src={img.url}
          alt={img.alt || productTitle}
          fill
          className={`object-cover transition-opacity duration-300 ease-out ${
            i === index ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
          }`}
          sizes="(min-width:768px) 50vw, 100vw"
          priority={i === 0}
        />
      ))}

      {n > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Vorheriges Bild"
              className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/35 text-lg font-semibold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Nächstes Bild"
              className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/35 text-lg font-semibold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              ›
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
                onClick={() => setIndex(i)}
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
