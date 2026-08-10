"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  reconcilePayPalPaymentForOrderAction,
  type ReconcilePayPalPaymentState,
} from "@/app/admin/(dashboard)/orders/actions";

const initial: ReconcilePayPalPaymentState = null;

export function OrderPayPalReconcileButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    reconcilePayPalPaymentForOrderAction,
    initial,
  );

  useEffect(() => {
    if (!state?.ok) return;
    router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="mt-4 flex max-w-md flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="text-sm text-primary" role="status">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
      >
        {pending ? "Prüfe PayPal…" : "Zahlung bei PayPal nachziehen"}
      </button>
      <p className="text-xs text-[#6b7280]">
        Für „extern bezahlt, intern offen“: PayPal-Order abfragen und bei COMPLETED/APPROVED denselben
        Capture-/Finalize-Pfad ausführen (idempotent).
      </p>
    </form>
  );
}
