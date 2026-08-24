"use client";

import { useActionState, useId, useState } from "react";
import { addToCart, type CartActionState } from "@/lib/cart/actions";
import {
  defaultAddQuantity,
  maxSelectableQuantity,
  type ProductQuantityRules,
} from "@/lib/cart/quantity";
import { CartIcon } from "@/components/storefront/cart-icon";
import {
  QuantityStepperButton,
  QuantityStepperValue,
} from "@/components/storefront/quantity-stepper";

const initial: CartActionState = null;

function clampQty(rules: ProductQuantityRules, value: number): number {
  const maxQty = maxSelectableQuantity(rules);
  const step = Math.max(1, rules.purchaseStep);
  let next = Math.max(rules.minOrderQty, Math.min(maxQty, value));
  const offset = next - rules.minOrderQty;
  next = rules.minOrderQty + Math.round(offset / step) * step;
  if (next > maxQty) next -= step;
  return Math.max(rules.minOrderQty, next);
}

export function AddToCartForm({
  productId,
  productVariantId,
  canAdd,
  quantityRules,
  compact = false,
  showCartIcon = false,
  layout = "default",
}: {
  productId: string;
  /** Epic 2: verkaufbare Variante; fehlt → Server nutzt Default-Variante. */
  productVariantId?: string;
  /** `false`, wenn z. B. kein Lager für die Mindestabnahme. */
  canAdd: boolean;
  quantityRules: ProductQuantityRules;
  /** Kompaktere Darstellung für Produktkarten (Startseite / Übersicht). */
  compact?: boolean;
  /** Warenkorb-Icon im Button (Produktdetailseite). */
  showCartIcon?: boolean;
  /** Stärkerer Kauf-CTA und vertikale Klarheit auf der PDP. */
  layout?: "default" | "pdp" | "sticky";
}) {
  const [state, formAction, pending] = useActionState(addToCart, initial);
  const qtyFieldId = useId();

  const defaultQty = defaultAddQuantity(quantityRules) ?? quantityRules.minOrderQty;
  const maxQty = maxSelectableQuantity(quantityRules);
  const [quantity, setQuantity] = useState(() => clampQty(quantityRules, defaultQty));
  const isPdp = !compact && layout === "pdp";
  const isSticky = layout === "sticky";

  if (!canAdd) {
    return (
      <p
        className={
          layout === "sticky"
            ? "hidden"
            : compact
              ? "text-base leading-snug text-(--foreground-muted)"
              : isPdp
                ? "text-base text-(--foreground-muted)"
                : "mt-8 text-base text-(--foreground-muted)"
        }
      >
        Derzeit nicht bestellbar (Lager oder Mindestabnahme).
      </p>
    );
  }

  const canDec = quantity - quantityRules.purchaseStep >= quantityRules.minOrderQty;
  const canInc = quantity + quantityRules.purchaseStep <= maxQty;

  return (
    <form
      action={formAction}
      className={
        compact ? "flex flex-col gap-3" : isPdp ? "mt-0 flex w-full max-w-md flex-col gap-3" : "mt-8 flex flex-col gap-2"
      }
    >
      <input type="hidden" name="productId" value={productId} />
      {productVariantId ? (
        <input type="hidden" name="productVariantId" value={productVariantId} />
      ) : null}
      <input type="hidden" name="quantity" value={quantity} />
      <div
        className={
          isSticky
            ? "flex"
            : compact
              ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
              : isPdp
                ? "flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
                : "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        }
      >
        {!isSticky ? (
          <div className={`flex min-w-0 flex-col gap-1.5 ${isPdp ? "sm:shrink-0" : ""}`}>
            <label htmlFor={qtyFieldId} className="text-sm font-medium text-(--foreground-muted) md:text-[0.9375rem]">
              Menge
            </label>
            <div className="inline-flex items-center gap-1.5" role="group" aria-labelledby={qtyFieldId}>
              <span id={qtyFieldId} className="sr-only">
                Menge
              </span>
              <QuantityStepperButton
                type="button"
                direction="dec"
                label="Menge verringern"
                disabled={!canDec || pending}
                onClick={() =>
                  setQuantity((q) => clampQty(quantityRules, q - quantityRules.purchaseStep))
                }
              />
              <QuantityStepperValue quantity={quantity} />
              <QuantityStepperButton
                type="button"
                direction="inc"
                label="Menge erhöhen"
                disabled={!canInc || pending}
                onClick={() =>
                  setQuantity((q) => clampQty(quantityRules, q + quantityRules.purchaseStep))
                }
              />
            </div>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className={
            isSticky
              ? "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50"
              : compact
                ? "rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 sm:shrink-0"
                : isPdp
                  ? "inline-flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-(--primary-hover) hover:shadow-lg disabled:opacity-50 sm:min-h-[2.75rem] sm:min-w-0 sm:flex-1 sm:py-3"
                  : `inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 ${showCartIcon ? "w-full max-w-md sm:w-full" : "w-full max-w-xs sm:w-auto"}`
          }
        >
          {!compact && !isSticky && showCartIcon ? (
            <CartIcon className={isPdp ? "size-5 shrink-0" : "shrink-0"} />
          ) : null}
          {pending ? "Wird hinzugefügt…" : isSticky ? "Warenkorb" : "In den Warenkorb"}
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
