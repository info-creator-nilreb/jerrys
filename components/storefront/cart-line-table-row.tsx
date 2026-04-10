import Image from "next/image";
import Link from "next/link";
import {
  decrementCartLineQuantity,
  incrementCartLineQuantity,
  submitRemoveCartLine,
} from "@/lib/cart/actions";
import { nextQuantityStep } from "@/lib/cart/quantity";
import { PriceEUR } from "@/components/storefront/price-eur";

type Line = {
  id: string;
  quantity: number;
  product: {
    id: string;
    slug: string;
    title: string;
    manufacturer: { name: string } | null;
    priceGrossCents: number;
    currency: string;
    isActive: boolean;
    stockQuantity: number;
    minOrderQty: number;
    purchaseStep: number;
    maxOrderQty: number | null;
    images: { url: string; alt: string }[];
  };
};

export function CartLineTableRow({ line }: { line: Line }) {
  const p = line.product;
  const img = p.images[0];
  const lineTotal = line.quantity * p.priceGrossCents;
  const rules = {
    stockQuantity: p.stockQuantity,
    minOrderQty: p.minOrderQty,
    purchaseStep: p.purchaseStep,
    maxOrderQty: p.maxOrderQty,
  };
  const canInc = p.isActive && nextQuantityStep(rules, line.quantity) !== null;

  if (!p.isActive) {
    return (
      <tr className="border-b border-(--surface-muted) bg-amber-50/40">
        <td className="py-6 pr-4" colSpan={4}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-(--foreground-heading)">{p.title}</p>
              <p className="mt-1 text-sm text-amber-900">Nicht mehr verfügbar.</p>
            </div>
            <form action={submitRemoveCartLine} className="shrink-0 sm:text-right">
              <input type="hidden" name="lineId" value={line.id} />
              <button
                type="submit"
                className="text-sm text-red-600 underline-offset-2 hover:underline"
                aria-label="Position entfernen"
              >
                Entfernen
              </button>
            </form>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-(--surface-muted) align-top">
      <td className="py-6 pr-4">
        <div className="flex gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-(--surface-muted) bg-(--surface-muted)">
            {img ? (
              <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="80px" />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-(--foreground-muted)">
                —
              </div>
            )}
          </div>
          <div className="min-w-0">
            {p.manufacturer ? (
              <p className="text-[11px] font-medium tracking-wide text-(--foreground-muted) uppercase">
                {p.manufacturer.name}
              </p>
            ) : null}
            <Link
              href={`/produkte/${p.slug}`}
              className="mt-0.5 block font-medium text-(--foreground-heading) hover:text-primary hover:underline"
            >
              {p.title}
            </Link>
          </div>
        </div>
      </td>
      <td className="px-3 py-6 text-right align-top whitespace-nowrap">
        <PriceEUR cents={p.priceGrossCents} />
      </td>
      <td className="px-3 py-6 align-top">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <form action={decrementCartLineQuantity}>
            <input type="hidden" name="lineId" value={line.id} />
            <button
              type="submit"
              className="flex size-9 items-center justify-center rounded-full border border-(--surface-muted) bg-white text-lg text-(--foreground-heading) transition-colors hover:bg-(--surface-soft) sm:size-10"
              aria-label="Menge verringern"
            >
              −
            </button>
          </form>
          <span className="min-w-[2.75rem] text-center text-sm font-medium tabular-nums sm:min-w-[3rem] sm:text-base">
            {line.quantity}
          </span>
          <form action={incrementCartLineQuantity}>
            <input type="hidden" name="lineId" value={line.id} />
            <button
              type="submit"
              disabled={!canInc}
              className="flex size-9 items-center justify-center rounded-full border border-(--surface-muted) bg-white text-lg text-(--foreground-heading) transition-colors hover:bg-(--surface-soft) disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
              aria-label="Menge erhöhen"
            >
              +
            </button>
          </form>
        </div>
      </td>
      <td className="px-3 py-6 pr-0 text-right whitespace-nowrap">
        <div className="flex flex-col items-end gap-2">
          <PriceEUR cents={lineTotal} className="font-medium text-(--foreground-heading)" />
          <form action={submitRemoveCartLine}>
            <input type="hidden" name="lineId" value={line.id} />
            <button
              type="submit"
              className="rounded border border-(--surface-muted) p-1.5 text-(--foreground-muted) hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              aria-label="Position entfernen"
            >
              <TrashIcon />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}
