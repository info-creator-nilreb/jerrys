"use client";

import { useActionState } from "react";
import { addToCart, type CartActionState } from "@/lib/cart/actions";
import { defaultAddQuantity, maxSelectableQuantity, type ProductQuantityRules } from "@/lib/cart/quantity";

const initial: CartActionState = null;

const qtyInputClass =
  "min-w-[5.5rem] rounded-md border border-(--surface-muted) bg-white px-3 py-2.5 text-base text-(--foreground-heading) outline-none ring-primary focus:border-primary focus:ring-1";

export function AddToCartForm({
  productId,
  canAdd,
  quantityRules,
  compact = false,
}: {
  productId: string;
  /** `false`, wenn z. B. kein Lager für die Mindestabnahme. */
  canAdd: boolean;
  quantityRules: ProductQuantityRules;
  /** Kompaktere Darstellung für Produktkarten (Startseite / Übersicht). */
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(addToCart, initial);

  if (!canAdd) {
    return (
      <p className={compact ? "text-base leading-snug text-(--foreground-muted)" : "mt-8 text-base text-(--foreground-muted)"}>
        Derzeit nicht bestellbar (Lager oder Mindestabnahme).
      </p>
    );
  }

  const defaultQty = defaultAddQuantity(quantityRules) ?? quantityRules.minOrderQty;
  const maxQty = maxSelectableQuantity(quantityRules);
  const qtyId = `add-qty-${productId}`;

  return (
    <form action={formAction} className={compact ? "flex flex-col gap-3" : "mt-8 flex flex-col gap-2"}>
      <input type="hidden" name="productId" value={productId} />
      <div
        className={
          compact
            ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            : "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        }
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={qtyId} className="text-sm font-medium text-(--foreground-muted) md:text-[0.9375rem]">
            Menge
          </label>
          <input
            id={qtyId}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={quantityRules.minOrderQty}
            max={maxQty}
            step={quantityRules.purchaseStep}
            defaultValue={String(defaultQty)}
            required
            className={compact ? `${qtyInputClass} w-full sm:w-24` : `${qtyInputClass} w-full max-w-[7rem]`}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className={
            compact
              ? "rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 sm:shrink-0"
              : "w-full max-w-xs rounded-md bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 sm:w-auto"
          }
        >
          {pending ? "Wird hinzugefügt…" : "In den Warenkorb"}
        </button>
      </div>
      {state?.error ? <p className="text-base text-red-600">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-base font-medium text-primary" role="status">
          Zum Warenkorb hinzugefügt.
        </p>
      ) : null}
    </form>
  );
}
