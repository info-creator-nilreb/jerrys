"use client";

import { useActionState } from "react";
import { addToCart, type CartActionState } from "@/lib/cart/actions";
import { defaultAddQuantity, maxSelectableQuantity, type ProductQuantityRules } from "@/lib/cart/quantity";
import { CartIcon } from "@/components/storefront/cart-icon";

const initial: CartActionState = null;

const qtyInputClass =
  "min-w-[5.5rem] rounded-md border border-(--surface-muted) bg-white px-3 py-2.5 text-base text-(--foreground-heading) outline-none ring-primary focus:border-primary focus:ring-1";

export function AddToCartForm({
  productId,
  canAdd,
  quantityRules,
  compact = false,
  showCartIcon = false,
  layout = "default",
}: {
  productId: string;
  /** `false`, wenn z. B. kein Lager für die Mindestabnahme. */
  canAdd: boolean;
  quantityRules: ProductQuantityRules;
  /** Kompaktere Darstellung für Produktkarten (Startseite / Übersicht). */
  compact?: boolean;
  /** Warenkorb-Icon im Button (Produktdetailseite). */
  showCartIcon?: boolean;
  /** Stärkerer Kauf-CTA und vertikale Klarheit auf der PDP. */
  layout?: "default" | "pdp";
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
  const isPdp = !compact && layout === "pdp";

  return (
    <form
      action={formAction}
      className={
        compact ? "flex flex-col gap-3" : isPdp ? "mt-0 flex w-full max-w-md flex-col gap-3" : "mt-8 flex flex-col gap-2"
      }
    >
      <input type="hidden" name="productId" value={productId} />
      <div
        className={
          compact
            ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            : isPdp
              ? "flex w-full flex-row flex-wrap items-end gap-3"
              : "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        }
      >
        <div className={`flex min-w-0 flex-col gap-1.5 ${isPdp ? "shrink-0" : ""}`}>
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
            className={
              compact
                ? `${qtyInputClass} w-full sm:w-24`
                : isPdp
                  ? `${qtyInputClass} w-full max-w-[6.5rem] sm:w-[6.5rem]`
                  : `${qtyInputClass} w-full max-w-[7rem]`
            }
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className={
            compact
              ? "rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 sm:shrink-0"
              : isPdp
                ? "inline-flex min-h-[2.85rem] w-full flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-(--primary-hover) hover:shadow-lg disabled:opacity-50 sm:min-w-0 sm:py-3"
                : `inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 ${showCartIcon ? "w-full max-w-md sm:w-full" : "w-full max-w-xs sm:w-auto"}`
          }
        >
          {!compact && showCartIcon ? <CartIcon className={isPdp ? "size-5 shrink-0" : "shrink-0"} /> : null}
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
