"use client";

import { ChevronDown } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminTripleAxisLabel,
  adminTripleOptionLabel,
  adminTripleOptions,
  adminTripleSelectSurfaceClass,
  deriveTripleFromOrder,
  isTripleOptionEnabled,
  pickNextStatusForDimension,
  type AdminTripleDimension,
  type OrderForTriple,
} from "@/lib/orders/order-admin-triple";
import {
  updateOrderStatus,
  type OrderStatusActionState,
} from "@/app/admin/(dashboard)/orders/actions";
import { allowedNextOrderStatuses } from "@/lib/orders/order-status-machine";

const initial: OrderStatusActionState = null;

const DIMENSIONS: AdminTripleDimension[] = ["payment", "shipping", "order"];

export function OrderStatusPanel({
  orderId,
  order,
}: {
  orderId: string;
  order: OrderForTriple;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOrderStatus, initial);
  const [flash, setFlash] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const triple = deriveTripleFromOrder(order);
  const canTransition = allowedNextOrderStatuses(order.status).length > 0;

  useEffect(() => {
    if (!state?.ok) return;
    let offTimer: number | undefined;
    const onTimer = window.setTimeout(() => {
      setFlash(true);
      router.refresh();
      offTimer = window.setTimeout(() => setFlash(false), 3000);
    }, 0);
    return () => {
      window.clearTimeout(onTimer);
      if (offTimer !== undefined) window.clearTimeout(offTimer);
    };
  }, [state?.ok, router]);

  const submitTo = (toStatus: string) => {
    if (!toInputRef.current || !formRef.current) return;
    toInputRef.current.value = toStatus;
    formRef.current.requestSubmit();
  };

  const handleDimensionChange = (dim: AdminTripleDimension, target: string) => {
    if (triple[dim] === target) return;
    const next = pickNextStatusForDimension(order, dim, target);
    if (!next) return;
    submitTo(next);
  };

  return (
    <div className="mt-3 space-y-3">
      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {flash ? (
          <p className="text-sm font-medium text-primary" role="status">
            Status wurde aktualisiert.
          </p>
        ) : null}
      </div>

      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="orderId" value={orderId} />
        <input ref={toInputRef} type="hidden" name="toStatus" defaultValue="" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DIMENSIONS.map((dim) => (
            <div key={dim} className="min-w-0">
              <label
                htmlFor={`order-status-${orderId}-${dim}`}
                className="mb-1.5 block text-sm text-[#4b5563]"
              >
                {adminTripleAxisLabel(dim)}
              </label>
              <div
                className={`relative flex rounded-full shadow-sm ${adminTripleSelectSurfaceClass(dim, triple[dim])}`}
              >
                <select
                  id={`order-status-${orderId}-${dim}`}
                  value={triple[dim]}
                  disabled={pending || !canTransition}
                  aria-busy={pending}
                  onChange={(e) => handleDimensionChange(dim, e.target.value)}
                  className="h-11 w-full min-w-0 flex-1 cursor-pointer appearance-none rounded-full border-0 bg-transparent pl-4 pr-10 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adminTripleOptions(dim).map((opt) => {
                    const enabled = isTripleOptionEnabled(order, dim, opt);
                    return (
                      <option key={opt} value={opt} disabled={!enabled && triple[dim] !== opt}>
                        {adminTripleOptionLabel(dim, opt)}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-70"
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>
      </form>

      {!canTransition ? (
        <p className="text-sm text-[#6b7280]">
          Für den aktuellen Status sind keine weiteren Wechsel vorgesehen.
        </p>
      ) : null}
    </div>
  );
}
