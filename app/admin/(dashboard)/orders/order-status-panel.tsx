"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateOrderStatus,
  type OrderStatusActionState,
} from "@/app/admin/(dashboard)/orders/actions";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

const initial: OrderStatusActionState = null;

export function OrderStatusPanel({
  orderId,
  allowedNext,
}: {
  orderId: string;
  allowedNext: string[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOrderStatus, initial);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!state?.ok) return;
    setFlash(true);
    router.refresh();
    const t = window.setTimeout(() => setFlash(false), 3000);
    return () => window.clearTimeout(t);
  }, [state?.ok, router]);

  if (allowedNext.length === 0) {
    return (
      <p className="mt-2 text-sm text-[#6b7280]">
        Für den aktuellen Status sind keine weiteren Wechsel vorgesehen.
      </p>
    );
  }

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
      <div className="flex flex-wrap gap-2" aria-busy={pending}>
        {allowedNext.map((to) => (
          <form key={to} action={formAction} className="inline">
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="toStatus" value={to} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] shadow-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              → {orderStatusLabel(to)}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
