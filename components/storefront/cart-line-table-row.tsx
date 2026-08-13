import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  decrementCartLineQuantity,
  incrementCartLineQuantity,
  submitRemoveCartLine,
} from "@/lib/cart/actions";
import { cartLineCommerceRules, type CartLineWithVariant } from "@/lib/cart/cart-queries";
import { nextQuantityStep } from "@/lib/cart/quantity";
import { PriceEUR } from "@/components/storefront/price-eur";

function QuantityStepper({
  lineId,
  quantity,
  canInc,
}: {
  lineId: string;
  quantity: number;
  canInc: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <form action={decrementCartLineQuantity}>
        <input type="hidden" name="lineId" value={lineId} />
        <button
          type="submit"
          className="flex size-9 items-center justify-center rounded-full border border-(--surface-muted) bg-white text-lg text-(--foreground-heading) transition-colors hover:bg-(--surface-soft) sm:size-10"
          aria-label="Menge verringern"
        >
          −
        </button>
      </form>
      <span
        className="min-w-[2.75rem] text-center text-sm font-medium tabular-nums sm:min-w-[3rem] sm:text-base"
        aria-label={`Menge ${quantity}`}
      >
        {quantity}
      </span>
      <form action={incrementCartLineQuantity}>
        <input type="hidden" name="lineId" value={lineId} />
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
  );
}

function RemoveButton({ lineId }: { lineId: string }) {
  return (
    <form action={submitRemoveCartLine}>
      <input type="hidden" name="lineId" value={lineId} />
      <button
        type="submit"
        className="rounded border border-(--surface-muted) p-1.5 text-(--foreground-muted) hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        aria-label="Position entfernen"
      >
        <Trash2 width={18} height={18} aria-hidden strokeWidth={1.5} />
      </button>
    </form>
  );
}

function lineCommerce(line: CartLineWithVariant) {
  const p = line.product;
  const commerce = cartLineCommerceRules(line);
  const img = p.images[0];
  const lineTotal = line.quantity * commerce.priceGrossCents;
  const rules = {
    availableQuantity: commerce.availableQuantity,
    minOrderQty: commerce.minOrderQty,
    purchaseStep: commerce.purchaseStep,
    maxOrderQty: commerce.maxOrderQty,
  };
  const canInc = p.isActive && nextQuantityStep(rules, line.quantity) !== null;
  return { p, commerce, img, lineTotal, canInc };
}

/** Mobile Kartenzeile — Menge immer im Viewport, ohne Horizontal-Scroll. */
export function CartLineMobileCard({ line }: { line: CartLineWithVariant }) {
  const { p, commerce, img, lineTotal, canInc } = lineCommerce(line);

  if (!p.isActive) {
    return (
      <li className="border-b border-(--surface-muted) bg-amber-50/40 py-5">
        <p className="font-medium text-(--foreground-heading)">{p.title}</p>
        <p className="mt-1 text-sm text-amber-900">Nicht mehr verfügbar.</p>
        <form action={submitRemoveCartLine} className="mt-3">
          <input type="hidden" name="lineId" value={line.id} />
          <button type="submit" className="text-sm text-red-600 underline-offset-2 hover:underline">
            Entfernen
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="border-b border-(--surface-muted) py-5">
      <div className="flex gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-(--surface-muted) bg-(--surface-muted)">
          {img ? (
            <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-(--foreground-muted)">—</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
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
          <p className="mt-1 text-sm text-(--foreground-muted)">
            <PriceEUR cents={commerce.priceGrossCents} />
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-[#9ca3af] uppercase">Menge</p>
          <div className="mt-1.5">
            <QuantityStepper lineId={line.id} quantity={line.quantity} canInc={canInc} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PriceEUR cents={lineTotal} className="font-medium text-(--foreground-heading)" />
          <RemoveButton lineId={line.id} />
        </div>
      </div>
    </li>
  );
}

/** Desktop-Tabellenzeile. */
export function CartLineTableRow({ line }: { line: CartLineWithVariant }) {
  const { p, commerce, img, lineTotal, canInc } = lineCommerce(line);

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
              <div className="flex size-full items-center justify-center text-sm text-(--foreground-muted)">—</div>
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
        <PriceEUR cents={commerce.priceGrossCents} />
      </td>
      <td className="px-3 py-6 align-top">
        <div className="flex justify-center">
          <QuantityStepper lineId={line.id} quantity={line.quantity} canInc={canInc} />
        </div>
      </td>
      <td className="px-3 py-6 pr-0 text-right whitespace-nowrap">
        <div className="flex flex-col items-end gap-2">
          <PriceEUR cents={lineTotal} className="font-medium text-(--foreground-heading)" />
          <RemoveButton lineId={line.id} />
        </div>
      </td>
    </tr>
  );
}
