"use client";

import { useActionState } from "react";
import { addToCart, type CartActionState } from "@/lib/cart/actions";

const initial: CartActionState = null;

export function AddToCartForm({
  productId,
  canAdd,
}: {
  productId: string;
  /** `false`, wenn z. B. kein Lager für die Mindestabnahme. */
  canAdd: boolean;
}) {
  const [state, formAction, pending] = useActionState(addToCart, initial);

  if (!canAdd) {
    return (
      <p className="mt-8 text-sm text-(--foreground-muted)">
        Derzeit nicht bestellbar (Lager oder Mindestabnahme).
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-2">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending}
        className="w-full max-w-xs rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Wird hinzugefügt…" : "In den Warenkorb"}
      </button>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm font-medium text-primary" role="status">
          Zum Warenkorb hinzugefügt.
        </p>
      ) : null}
    </form>
  );
}
