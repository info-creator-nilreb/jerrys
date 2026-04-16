"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  pickNextStatusForDimension,
  type OrderForTriple,
} from "@/lib/orders/order-admin-triple";
import { updateOrderStatus, type OrderStatusActionState } from "@/app/admin/(dashboard)/orders/actions";

const initial: OrderStatusActionState = null;

export function OrderRefundButton({ orderId, order }: { orderId: string; order: OrderForTriple }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOrderStatus, initial);
  const nextStatus = pickNextStatusForDimension(order, "payment", "erstattet");

  useEffect(() => {
    if (!state?.ok) return;
    router.refresh();
  }, [state?.ok, router]);

  if (!nextStatus) {
    return (
      <p className="text-sm text-[#6b7280]">
        Eine Erstattung ist für den aktuellen Status nicht vorgesehen oder bereits erfolgt.
      </p>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="toStatus" value={nextStatus} />
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? "Wird ausgeführt…" : "Rückerstattung auslösen"}
      </button>
      <p className="text-xs text-[#6b7280]">
        Setzt den Bestellablauf auf „erstattet“ gemäß erlaubten Statuswechseln (inkl. E-Mail an die Kundin /
        den Kunden, falls vorgesehen).
      </p>
    </form>
  );
}
