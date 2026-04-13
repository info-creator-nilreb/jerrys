"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "@/lib/catalog/format";
import {
  decrementCartLineQuantity,
  getCartFlyoutPreview,
  incrementCartLineQuantity,
  submitRemoveCartLine,
  type CartFlyoutPreview,
} from "@/lib/cart/actions";
import { CartIcon } from "@/components/storefront/cart-icon";

type Props = {
  cartBadgeCount: number;
};

export function HeaderCartFlyout({ cartBadgeCount }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<CartFlyoutPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCartFlyoutPreview();
      setPreview(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadPreview();
  }, [open, loadPreview, cartBadgeCount]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const overlay =
    open && mounted ? (
      <div className="fixed inset-0 z-[600000] flex justify-end">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          aria-label="Warenkorb schließen"
          onClick={() => setOpen(false)}
        />
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className="relative z-[600001] flex h-full w-full max-w-md flex-col border-l border-(--surface-muted) bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-(--surface-muted) px-4 py-4">
            <h2 id={`${panelId}-title`} className="text-lg font-semibold text-(--foreground-heading)">
              Warenkorb
            </h2>
            <button
              type="button"
              className="rounded-md p-2 text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-(--foreground-heading)"
              aria-label="Schließen"
              onClick={() => setOpen(false)}
            >
              <span aria-hidden className="text-xl leading-none">
                ×
              </span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loading && !preview ? (
              <p className="text-sm text-(--foreground-muted)">Wird geladen…</p>
            ) : !preview?.lines.length ? (
              <p className="text-sm text-(--foreground-muted)">Dein Warenkorb ist leer.</p>
            ) : (
              <ul className="space-y-4">
                {preview.lines.map((line) => (
                  <li key={line.lineId} className="flex gap-3 border-b border-(--surface-muted) pb-4 last:border-0 last:pb-0">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-(--surface-muted)">
                      {line.imageUrl ? (
                        <Image
                          src={line.imageUrl}
                          alt={line.imageAlt || line.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized={line.imageUrl.startsWith("/")}
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xs text-(--foreground-muted)">
                          —
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/produkte/${line.productSlug}`}
                        className="font-medium text-(--foreground-heading) hover:text-primary"
                        onClick={() => setOpen(false)}
                      >
                        {line.title}
                      </Link>
                      <p className="mt-1 text-sm text-(--foreground-muted)">
                        {formatPrice(line.unitPriceGrossCents, line.currency)} × {line.quantity}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form action={incrementCartLineQuantity}>
                          <input type="hidden" name="lineId" value={line.lineId} />
                          <button
                            type="submit"
                            className="rounded border border-(--surface-muted) px-2 py-1 text-sm hover:border-primary hover:text-primary"
                            aria-label="Menge erhöhen"
                          >
                            +
                          </button>
                        </form>
                        <form action={decrementCartLineQuantity}>
                          <input type="hidden" name="lineId" value={line.lineId} />
                          <button
                            type="submit"
                            className="rounded border border-(--surface-muted) px-2 py-1 text-sm hover:border-primary hover:text-primary"
                            aria-label="Menge verringern"
                          >
                            −
                          </button>
                        </form>
                        <form action={submitRemoveCartLine}>
                          <input type="hidden" name="lineId" value={line.lineId} />
                          <button
                            type="submit"
                            className="text-xs text-(--foreground-muted) underline-offset-2 hover:text-primary hover:underline"
                          >
                            Entfernen
                          </button>
                        </form>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-(--foreground-heading)">
                      {formatPrice(line.lineTotalGrossCents, line.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-(--surface-muted) bg-(--surface-soft) px-4 py-4">
            {preview && preview.lines.length > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-(--foreground-muted)">Zwischensumme</span>
                  <span className="font-semibold text-(--foreground-heading)">
                    {formatPrice(preview.subtotalGrossCents, preview.currency)}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href="/checkout"
                    className="rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-(--primary-hover)"
                    onClick={() => setOpen(false)}
                  >
                    Zur Kasse
                  </Link>
                  <Link
                    href="/warenkorb"
                    className="rounded-md border border-(--surface-muted) bg-white px-4 py-3 text-center text-sm font-medium text-(--foreground-heading) hover:border-primary hover:text-primary"
                    onClick={() => setOpen(false)}
                  >
                    Warenkorb anzeigen
                  </Link>
                </div>
              </>
            ) : (
              <Link
                href="/produkte"
                className="block rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-(--primary-hover)"
                onClick={() => setOpen(false)}
              >
                Zu den Produkten
              </Link>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        className="absolute top-1/2 right-4 -translate-y-1/2 rounded-md p-2 text-(--foreground-heading) transition-colors hover:text-primary md:right-6"
        aria-label={`Warenkorb${cartBadgeCount > 0 ? `, ${cartBadgeCount} Artikel` : ""}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="relative inline-flex">
          <CartIcon className="size-7" />
          {cartBadgeCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {cartBadgeCount > 99 ? "99+" : cartBadgeCount}
            </span>
          ) : null}
        </span>
      </button>
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
