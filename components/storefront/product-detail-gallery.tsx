"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";

export type GalleryImage = { id: string; url: string; alt: string };

export function ProductDetailGallery({
  images,
  isBestseller,
  productTitle,
}: {
  images: GalleryImage[];
  isBestseller: boolean;
  productTitle: string;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(0, images.length - 1));
  const current = images[safeIndex];

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const n = images.length;
        if (n === 0) return 0;
        return (i + dir + n) % n;
      });
    },
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-(--surface-muted) bg-(--surface-muted)">
        {isBestseller ? (
          <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <ShoppingCart width={14} height={14} aria-hidden strokeWidth={1.5} />
            Bestseller
          </span>
        ) : null}
        <Image
          src={current.url}
          alt={current.alt || productTitle}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 45vw, 100vw"
          priority
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-(--surface-muted) bg-white/95 text-(--foreground-heading) shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft width={18} height={18} aria-hidden strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-(--surface-muted) bg-white/95 text-(--foreground-heading) shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Nächstes Bild"
            >
              <ChevronRight width={18} height={18} aria-hidden strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Produktbilder">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                i === safeIndex ? "border-primary" : "border-transparent ring-1 ring-(--surface-muted)"
              }`}
            >
              <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
