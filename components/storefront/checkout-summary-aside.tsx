import Image from "next/image";
import { formatPrice } from "@/lib/catalog/format";
import { PriceEUR } from "@/components/storefront/price-eur";
import { vatCentsFromGross } from "@/lib/catalog/pricing";

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
  subtotalCents,
  shippingCents,
  currency,
}: {
  lines: CheckoutSummaryLine[];
  subtotalCents: number;
  shippingCents: number;
  currency: string;
}) {
  const taxSum = lines.reduce(
    (s, l) => s + vatCentsFromGross(l.quantity * l.product.priceGrossCents, l.product.taxRatePercent),
    0,
  );
  const total = subtotalCents + shippingCents;

  return (
    <aside className="border-t border-(--surface-muted) bg-(--surface-soft) p-6 lg:border-t-0 lg:border-l lg:pl-8">
      <h2 className="text-sm font-semibold text-(--foreground-heading)">Bestellübersicht</h2>
      <ul className="mt-6 space-y-4">
        {lines.map((line) => {
          const img = line.product.images[0];
          return (
            <li key={line.id} className="flex gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-(--surface-muted) bg-white">
                {img ? (
                  <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="64px" />
                ) : null}
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#1f1f1f] text-[10px] font-bold text-white">
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

      <div className="mt-6 border-t border-(--surface-muted) pt-6">
        <label className="text-sm font-medium text-(--foreground-muted)">Rabattcode oder Gutschein</label>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            disabled
            placeholder="Demnächst"
            className="min-w-0 flex-1 rounded-md border border-(--surface-muted) bg-white px-3 py-2 text-sm opacity-60"
          />
          <button
            type="button"
            disabled
            className="shrink-0 rounded-md border border-(--surface-muted) bg-(--surface-muted) px-3 py-2 text-sm font-medium text-(--foreground-muted) opacity-70"
          >
            Anwenden
          </button>
        </div>
      </div>

      <dl className="mt-8 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-(--foreground-muted)">Zwischensumme</dt>
          <dd>
            <PriceEUR cents={subtotalCents} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="flex items-center gap-1 text-(--foreground-muted)">
            Versand
            <span className="inline-flex size-4 items-center justify-center rounded-full border border-(--surface-muted) text-[10px] text-(--foreground-muted)" title="Versandkosten nach Adresse">
              ?
            </span>
          </dt>
          <dd className="text-right text-(--foreground-muted)">
            {shippingCents === 0 ? "Lieferadresse eingeben" : formatPrice(shippingCents, currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-(--surface-muted) pt-3 text-base font-semibold">
          <dt className="text-(--foreground-heading)">Gesamt</dt>
          <dd className="text-(--foreground-heading)">
            <PriceEUR cents={total} />
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-(--foreground-muted)">inkl. {formatPrice(taxSum, currency)} MwSt.</p>
    </aside>
  );
}
