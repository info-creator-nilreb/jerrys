"use client";

import { StorefrontImage } from "@/components/storefront/storefront-image";
import { useCallback, useEffect, useId, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { formatPrice } from "@/lib/catalog/format";
import {
  decrementCartLineQuantity,
  getCartFlyoutPreview,
  incrementCartLineQuantity,
  submitRemoveCartLine,
  type CartFlyoutPreview,
} from "@/lib/cart/actions";
import {
  STOREFRONT_CART_UPDATED,
  type StorefrontCartUpdatedDetail,
} from "@/lib/cart/cart-client-events";
import { CartIcon } from "@/components/storefront/cart-icon";
import {
  QuantityStepperButton,
  QuantityStepperValue,
} from "@/components/storefront/quantity-stepper";
import {
  useStorefrontHeaderOverlayLock,
  useStorefrontHeaderUi,
} from "@/components/storefront/storefront-header-ui";

type Props = {
  cartBadgeCount: number;
};

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function HeaderCartFlyout({ cartBadgeCount }: Props) {
  const panelId = useId();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mounted = useClientMounted();
  const [preview, setPreview] = useState<CartFlyoutPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayBadgeCount, setDisplayBadgeCount] = useState(cartBadgeCount);
  const { controlClassName } = useStorefrontHeaderUi();
  useStorefrontHeaderOverlayLock("cart", open);

  useEffect(() => {
    setDisplayBadgeCount(cartBadgeCount);
  }, [cartBadgeCount]);

  useEffect(() => {
    const onCartUpdated = (event: Event) => {
      const detail = (event as CustomEvent<StorefrontCartUpdatedDetail>).detail;
      const delta = detail?.quantityDelta;
      if (typeof delta === "number" && delta > 0) {
        setDisplayBadgeCount((count) => count + delta);
      }
    };
    window.addEventListener(STOREFRONT_CART_UPDATED, onCartUpdated);
    return () => window.removeEventListener(STOREFRONT_CART_UPDATED, onCartUpdated);
  }, []);

  const isNavigating = isPending || (navTarget !== null && pathname !== navTarget);

  const closeFlyout = useCallback(() => {
    if (isNavigating) return;
    setOpen(false);
    setNavTarget(null);
  }, [isNavigating]);

  const navigateFromFlyout = useCallback(
    (href: string) => {
      if (pathname === href) {
        setOpen(false);
        setNavTarget(null);
        return;
      }
      setNavTarget(href);
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router],
  );

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
      if (e.key === "Escape") closeFlyout();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeFlyout]);

  useEffect(() => {
    if (!navTarget) return;
    const timer = window.setTimeout(() => setNavTarget(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [navTarget]);

  useEffect(() => {
    if (!navTarget || pathname !== navTarget) return;
    setOpen(false);
    setNavTarget(null);
  }, [navTarget, pathname]);

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
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px] disabled:cursor-wait"
          aria-label="Warenkorb schließen"
          disabled={isNavigating}
          onClick={closeFlyout}
        />
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-busy={isNavigating}
          aria-labelledby={`${panelId}-title`}
          className="relative z-[600001] flex h-full w-full max-w-none flex-col border-l border-(--surface-muted) bg-white shadow-2xl sm:max-w-md"
        >
          <div className="flex items-center justify-between border-b border-(--surface-muted) px-4 py-4">
            <h2 id={`${panelId}-title`} className="text-lg font-semibold text-(--foreground-heading)">
              Warenkorb
            </h2>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-(--foreground-heading) disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Schließen"
              disabled={isNavigating}
              onClick={closeFlyout}
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
                        <StorefrontImage
                          src={line.imageUrl}
                          alt={line.imageAlt || line.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xs text-(--foreground-muted)">
                          —
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="text-left font-medium text-(--foreground-heading) hover:text-primary disabled:cursor-wait disabled:opacity-70"
                        disabled={isNavigating}
                        onClick={() => navigateFromFlyout(`/produkte/${line.productSlug}`)}
                      >
                        {line.title}
                      </button>
                      <p className="mt-1 text-sm text-(--foreground-muted)">
                        {formatPrice(line.unitPriceGrossCents, line.currency)} × {line.quantity}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5">
                          <form action={decrementCartLineQuantity}>
                            <input type="hidden" name="lineId" value={line.lineId} />
                            <QuantityStepperButton direction="dec" label="Menge verringern" />
                          </form>
                          <QuantityStepperValue quantity={line.quantity} />
                          <form action={incrementCartLineQuantity}>
                            <input type="hidden" name="lineId" value={line.lineId} />
                            <QuantityStepperButton direction="inc" label="Menge erhöhen" />
                          </form>
                        </div>
                        <form action={submitRemoveCartLine}>
                          <input type="hidden" name="lineId" value={line.lineId} />
                          <button
                            type="submit"
                            className="inline-flex min-h-11 items-center px-2 text-sm text-(--foreground-muted) underline-offset-2 hover:text-primary hover:underline"
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

          <div className="border-t border-(--surface-muted) bg-(--surface-soft) px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {preview && preview.lines.length > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-(--foreground-muted)">Zwischensumme</span>
                  <span className="font-semibold text-(--foreground-heading)">
                    {formatPrice(preview.subtotalGrossCents, preview.currency)}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isNavigating}
                    className="rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:cursor-wait disabled:opacity-80"
                    onClick={() => navigateFromFlyout("/checkout")}
                  >
                    {isNavigating && navTarget === "/checkout" ? "Wird geladen…" : "Zur Kasse"}
                  </button>
                  <button
                    type="button"
                    disabled={isNavigating}
                    className="rounded-md border border-(--surface-muted) bg-white px-4 py-3 text-center text-sm font-medium text-(--foreground-heading) hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-80"
                    onClick={() => navigateFromFlyout("/warenkorb")}
                  >
                    {isNavigating && navTarget === "/warenkorb"
                      ? "Wird geladen…"
                      : "Warenkorb anzeigen"}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                disabled={isNavigating}
                className="block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:cursor-wait disabled:opacity-80"
                onClick={() => navigateFromFlyout("/produkte")}
              >
                {isNavigating && navTarget === "/produkte" ? "Wird geladen…" : "Zu den Produkten"}
              </button>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        className={`relative z-[500001] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${controlClassName}`}
        aria-label={`Warenkorb${displayBadgeCount > 0 ? `, ${displayBadgeCount} Artikel` : ""}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (isNavigating) return;
          setOpen((v) => !v);
        }}
      >
        <span className="relative inline-flex">
          <CartIcon className="size-7" />
          {displayBadgeCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {displayBadgeCount > 99 ? "99+" : displayBadgeCount}
            </span>
          ) : null}
        </span>
      </button>
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
