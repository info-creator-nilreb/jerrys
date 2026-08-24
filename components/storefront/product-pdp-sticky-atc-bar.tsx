"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import type { ProductQuantityRules } from "@/lib/cart/quantity";

/**
 * Mobile Sticky-Leiste: erscheint, wenn der Commerce-Block nach oben aus dem Viewport scrollt.
 * Portal auf document.body, damit position:fixed zuverlässig am Viewport klebt.
 */
export function ProductPdpStickyAtcBar({
  sentinelId,
  productTitle,
  imageUrl,
  imageAlt,
  priceFormatted,
  productId,
  productVariantId,
  canAdd,
  quantityRules,
}: {
  sentinelId: string;
  productTitle: string;
  imageUrl: string | null;
  imageAlt: string;
  priceFormatted: string;
  productId: string;
  productVariantId: string;
  canAdd: boolean;
  quantityRules: ProductQuantityRules;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canAdd) return;

    const el = document.getElementById(sentinelId);
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setVisible(scrolledPast);
      },
      { root: null, threshold: [0, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelId, canAdd]);

  if (!canAdd || !visible || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[600000] border-t border-(--surface-muted) bg-white/98 shadow-[0_-4px_16px_rgb(0_0_0/0.08)] backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}
      role="region"
      aria-label="Schnell in den Warenkorb"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        {imageUrl ? (
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-(--surface-muted) bg-(--surface-soft)">
            <Image src={imageUrl} alt={imageAlt} fill className="object-cover" sizes="40px" />
          </div>
        ) : (
          <div
            className="size-10 shrink-0 rounded-md border border-(--surface-muted) bg-(--surface-soft)"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-(--foreground-heading)">{productTitle}</p>
          <p className="text-sm font-semibold text-primary">{priceFormatted}</p>
        </div>
        <AddToCartForm
          productId={productId}
          productVariantId={productVariantId}
          canAdd={canAdd}
          quantityRules={quantityRules}
          layout="sticky"
        />
      </div>
    </div>,
    document.body,
  );
}
