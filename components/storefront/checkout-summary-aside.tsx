import Image from "next/image";
import { formatPrice } from "@/lib/catalog/format";
import { PriceEUR } from "@/components/storefront/price-eur";

export type CheckoutSummaryLine = {
  id: string;
  quantity: number;
  product: {
    title: string;
    priceGrossCents: number;
    taxRatePercent: number;
    images: { url: string; alt: string }[];
  };
};

export function CheckoutSummaryAside({
  lines,
  shippingCents,
  taxAmountCents,
  totalCents,
  vatApplies,
  currency,
  catalogSubtotalBeforeDiscountCents,
  discountOffSubtotalCents,
  discountLabel,
  discountDetail,
  shippingSavedByPromotionCents,
  shippingPromotionLabel,
  children,
}: {
  lines: CheckoutSummaryLine[];
  shippingCents: number;
  taxAmountCents: number;
  totalCents: number;
  vatApplies: boolean;
  currency: string;
  /** Warenwert vor Rabatt (Anzeige Zwischensumme). */
  catalogSubtotalBeforeDiscountCents: number;
  discountOffSubtotalCents: number;
  discountLabel?: string | null;
  discountDetail?: string | null;
  shippingSavedByPromotionCents: number;
  shippingPromotionLabel?: string | null;
  children?: React.ReactNode;
}) {
  const hasDiscount = discountOffSubtotalCents > 0;
  const hasShippingPromotionSave = shippingSavedByPromotionCents > 0;

  return (
    <aside className="order-1 min-w-0 border-b border-(--surface-muted) bg-(--surface-soft) p-6 lg:order-2 lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100dvh-5.75rem)] lg:overflow-y-auto lg:self-start lg:border-b-0 lg:border-l lg:pl-8">
      <h2 className="text-sm font-semibold text-(--foreground-heading)">Bestellübersicht</h2>
      <ul className="mt-6 space-y-4">
        {lines.map((line) => {
          const img = line.product.images[0];
          return (
            <li key={line.id} className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0">
                <div className="relative h-full w-full overflow-hidden rounded-md border border-(--surface-muted) bg-white">
                  {img ? (
                    <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="64px" />
                  ) : null}
                </div>
                <span
                  className="absolute -right-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full bg-[#1f1f1f] text-[10px] font-bold text-white ring-2 ring-(--surface-soft)"
                  aria-label={`Menge: ${line.quantity}`}
                >
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-(--foreground-heading)">
                  {line.product.title}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <PriceEUR cents={line.quantity * line.product.priceGrossCents} />
              </div>
            </li>
          );
        })}
      </ul>

      {children}

      <dl className="mt-8 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-(--foreground-muted)">Zwischensumme</dt>
          <dd>
            <PriceEUR cents={catalogSubtotalBeforeDiscountCents} />
          </dd>
        </div>
        {hasDiscount ? (
          <div className="flex justify-between gap-4 text-emerald-800">
            <dt className="min-w-0 flex-1">
              <span className="block font-medium">Rabatt</span>
              {discountLabel ? (
                <span className="block text-xs font-normal text-(--foreground-muted)">{discountLabel}</span>
              ) : null}
              {discountDetail ? (
                <span className="block text-xs text-(--foreground-muted)">{discountDetail}</span>
              ) : null}
            </dt>
            <dd className="shrink-0">−{formatPrice(discountOffSubtotalCents, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="flex items-center gap-1 text-(--foreground-muted)">
            Versand
            <span
              className="inline-flex size-4 items-center justify-center rounded-full border border-(--surface-muted) text-[10px] text-(--foreground-muted)"
              title="Versandkosten nach Adresse"
            >
              ?
            </span>
          </dt>
          <dd className="text-right text-(--foreground-muted)">
            <div>{shippingCents === 0 ? "kostenlos" : formatPrice(shippingCents, currency)}</div>
            {hasShippingPromotionSave ? (
              <div className="mt-1 text-xs font-medium text-emerald-800">
                {shippingPromotionLabel ? `${shippingPromotionLabel}: ` : null}
                Versand gespart {formatPrice(shippingSavedByPromotionCents, currency)}
              </div>
            ) : null}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-(--surface-muted) pt-3 text-base font-semibold">
          <dt className="text-(--foreground-heading)">Gesamt</dt>
          <dd className="text-(--foreground-heading)">
            <PriceEUR cents={totalCents} />
          </dd>
        </div>
      </dl>
      {vatApplies ? (
        <p className="mt-2 text-sm text-(--foreground-muted)">
          inkl. {formatPrice(taxAmountCents, currency)} MwSt.
        </p>
      ) : (
        <p className="mt-2 text-sm text-(--foreground-muted)">
          Ohne ausgewiesene Umsatzsteuer (Lieferung außerhalb der EU).
        </p>
      )}
    </aside>
  );
}
