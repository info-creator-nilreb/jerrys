"use client";

import { useActionState, useEffect, useId, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/catalog/format";
import { readOrderPaymentRefundMeta } from "@/lib/payments/order-payment-refund-meta";
import {
  issueOrderRefundAction,
  type IssueOrderRefundActionState,
} from "@/app/admin/(dashboard)/orders/actions";

const initial: IssueOrderRefundActionState = null;

type PaymentRow = {
  id: string;
  provider: string;
  status: string;
  amountGrossCents: number;
  currency: string;
  metadata: unknown;
};

type Props = {
  orderId: string;
  orderStatus: string;
  currency: string;
  totalGrossCents: number;
  payments: PaymentRow[];
};

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  return `ar${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 32);
}

export function OrderRefundButton({
  orderId,
  orderStatus,
  currency,
  totalGrossCents,
  payments,
}: Props) {
  const router = useRouter();
  const amountId = useId();
  const noteId = useId();
  const [state, formAction, pending] = useActionState(issueOrderRefundAction, initial);
  const idempotencyKey = useMemo(() => newIdempotencyKey(), []);

  useEffect(() => {
    if (!state?.ok) return;
    router.refresh();
  }, [state?.ok, router]);

  if (orderStatus === "refunded") {
    return (
      <p className="text-sm text-[#6b7280]">Diese Bestellung ist bereits als erstattet markiert.</p>
    );
  }

  const paypalPayment = payments.find(
    (p) =>
      p.provider === "paypal" &&
      (p.status === "succeeded" || p.status === "partially_refunded"),
  );
  const meta = paypalPayment ? readOrderPaymentRefundMeta(paypalPayment.metadata) : {};
  const refundedCents = meta.refundedCents ?? 0;
  const remainingCents = paypalPayment
    ? Math.max(0, paypalPayment.amountGrossCents - refundedCents)
    : 0;

  if (paypalPayment && remainingCents <= 0) {
    return (
      <p className="text-sm text-[#6b7280]">
        Die PayPal-Zahlung ist vollständig erstattet. Bestellstatus ggf. noch anpassen.
      </p>
    );
  }

  if (paypalPayment) {
    const defaultEuro = (remainingCents / 100).toFixed(2).replace(".", ",");
    return (
      <form action={formAction} className="flex max-w-md flex-col gap-3">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="manualOnly" value="0" />
        <p className="text-sm text-[#374151]">
          PayPal-Erstattung (providerbestätigt). Erstattet:{" "}
          {formatPrice(refundedCents, currency)} · Rest:{" "}
          <span className="font-semibold">{formatPrice(remainingCents, currency)}</span>
        </p>
        <div>
          <label htmlFor={amountId} className="block text-xs font-medium text-[#6b7280]">
            Betrag (EUR)
          </label>
          <input
            id={amountId}
            name="amountEuro"
            type="text"
            inputMode="decimal"
            defaultValue={defaultEuro}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor={noteId} className="block text-xs font-medium text-[#6b7280]">
            Hinweis an Kundin/Kunden (optional)
          </label>
          <input
            id={noteId}
            name="note"
            type="text"
            maxLength={255}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
          />
        </div>
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
          {pending ? "Wird erstattet…" : "PayPal-Erstattung auslösen"}
        </button>
        <p className="text-xs text-[#6b7280]">
          Erst nach erfolgreicher PayPal-Bestätigung wird der Shop-Status aktualisiert. Teilbeträge
          möglich; bei vollständiger Erstattung wechselt die Bestellung auf „erstattet“.
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className="inline-flex max-w-md flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="manualOnly" value="1" />
      <p className="text-sm text-[#374151]">
        Keine PayPal-Zahlung mit Restbetrag. Manuell als erstattet markieren (
        {formatPrice(totalGrossCents, currency)}) — z. B. nach Banküberweisung.
      </p>
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
        className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? "Wird ausgeführt…" : "Manuell als erstattet markieren"}
      </button>
    </form>
  );
}
