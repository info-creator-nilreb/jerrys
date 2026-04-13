"use client";

import { useActionState } from "react";
import { RotateCw } from "lucide-react";
import { resendOrderEmail, type ResendOrderEmailState } from "@/app/admin/(dashboard)/orders/actions";

const initial: ResendOrderEmailState = null;

export function OrderEmailLogResendButton({
  orderId,
  emailType,
}: {
  orderId: string;
  emailType: string;
}) {
  const [state, formAction, pending] = useActionState(resendOrderEmail, initial);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#ecece8] pt-2">
      <form action={formAction} className="inline-flex items-center gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="emailType" value={emailType} />
        <button
          type="submit"
          disabled={pending}
          aria-label="E-Mail erneut senden"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-2.5 py-1 text-xs font-medium text-[#374151] shadow-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <RotateCw className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
          Erneut senden
        </button>
      </form>
      <span className="min-w-0 flex-1 text-xs" aria-live="polite">
        {pending ? <span className="text-[#6b7280]">Wird gesendet…</span> : null}
        {!pending && state?.error ? (
          <span className="text-red-600" role="alert">
            {state.error}
          </span>
        ) : null}
        {!pending && state?.ok && state.message ? (
          <span className="font-medium text-primary" role="status">
            {state.message}
          </span>
        ) : null}
      </span>
    </div>
  );
}
