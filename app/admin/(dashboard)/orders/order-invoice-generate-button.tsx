"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  generateOrderInvoiceDocument,
  type GenerateInvoiceState,
} from "@/app/admin/(dashboard)/orders/actions";

const initial: GenerateInvoiceState = null;

export function OrderInvoiceGenerateButton({
  orderId,
  disabled,
}: {
  orderId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(generateOrderInvoiceDocument, initial);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="text-sm font-medium text-primary" role="status">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || disabled}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Wird erzeugt…" : "Rechnung erzeugen"}
      </button>
    </form>
  );
}
