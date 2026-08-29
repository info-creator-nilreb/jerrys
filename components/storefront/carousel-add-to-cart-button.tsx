"use client";

import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import type { CartActionState } from "@/lib/cart/actions";
import { notifyStorefrontCartUpdated } from "@/lib/cart/cart-client-events";
import {
  defaultAddQuantity,
  type ProductQuantityRules,
} from "@/lib/cart/quantity";
import { CartIcon } from "@/components/storefront/cart-icon";

type Props = {
  productId: string;
  productVariantId: string;
  quantityRules: ProductQuantityRules;
};

export function CarouselAddToCartButton({
  productId,
  productVariantId,
  quantityRules,
}: Props) {
  const defaultQty = defaultAddQuantity(quantityRules) ?? quantityRules.minOrderQty;
  const [quantity] = useState(defaultQty);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<CartActionState>(null);
  const optimisticDeltaRef = useRef(0);
  const [submitGeneration, setSubmitGeneration] = useState(0);
  const slowPendingTimerRef = useRef<number | null>(null);
  const [slowPendingGeneration, setSlowPendingGeneration] = useState(0);
  const showSlowPending = pending && slowPendingGeneration === submitGeneration;

  const stopCarouselEvent = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const submitCarouselAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const formData = new FormData(event.currentTarget);
    optimisticDeltaRef.current = quantity;
    notifyStorefrontCartUpdated({ quantityDelta: quantity });

    if (slowPendingTimerRef.current !== null) {
      window.clearTimeout(slowPendingTimerRef.current);
    }
    setSubmitGeneration((prev) => {
      const generation = prev + 1;
      slowPendingTimerRef.current = window.setTimeout(() => {
        slowPendingTimerRef.current = null;
        setSlowPendingGeneration(generation);
      }, 400);
      return generation;
    });

    setPending(true);
    setState(null);

    try {
      const response = await fetch("/api/storefront/cart/add", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const nextState = (await response.json()) as CartActionState;

      if (nextState?.ok) {
        notifyStorefrontCartUpdated({ badgeCount: nextState.badgeCount });
        optimisticDeltaRef.current = 0;
      } else if (nextState?.error && optimisticDeltaRef.current !== 0) {
        notifyStorefrontCartUpdated({ quantityDelta: -optimisticDeltaRef.current });
        optimisticDeltaRef.current = 0;
      }

      setState(nextState);
    } catch {
      if (optimisticDeltaRef.current !== 0) {
        notifyStorefrontCartUpdated({ quantityDelta: -optimisticDeltaRef.current });
        optimisticDeltaRef.current = 0;
      }
      setState({ error: "Hinzufügen fehlgeschlagen." });
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={submitCarouselAdd}
      onPointerDown={stopCarouselEvent}
      onClick={stopCarouselEvent}
      className="inline-flex"
      data-carousel-control
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productVariantId" value={productVariantId} />
      <input type="hidden" name="quantity" value={quantity} />
      <button
        type="submit"
        onPointerDown={stopCarouselEvent}
        onClick={stopCarouselEvent}
        aria-busy={pending}
        aria-label={pending && showSlowPending ? "Wird hinzugefügt…" : "In den Warenkorb"}
        className="inline-flex size-9 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-busy:opacity-70"
      >
        <CartIcon className="size-4" />
      </button>
      {state?.error ? (
        <p className="sr-only" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="sr-only" role="status">
          Zum Warenkorb hinzugefügt.
        </p>
      ) : null}
    </form>
  );
}
