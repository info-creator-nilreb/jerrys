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
  markOrderShippedWithDetails,
  updateOrderStatus,
  type MarkOrderShippedState,
  type OrderStatusActionState,
} from "@/app/admin/(dashboard)/orders/actions";
import { allowedNextOrderStatuses } from "@/lib/orders/order-status-machine";

const initial: OrderStatusActionState = null;
const shipInitial: MarkOrderShippedState = null;

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
  const [shipState, shipFormAction, shipPending] = useActionState(markOrderShippedWithDetails, shipInitial);
  const [flash, setFlash] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
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

  useEffect(() => {
    if (!shipState?.ok) return;
    let offTimer: number | undefined;
    const onTimer = window.setTimeout(() => {
      setShipModalOpen(false);
      setFlash(true);
      router.refresh();
      offTimer = window.setTimeout(() => setFlash(false), 3000);
    }, 0);
    return () => {
      window.clearTimeout(onTimer);
      if (offTimer !== undefined) window.clearTimeout(offTimer);
    };
  }, [shipState?.ok, router]);

  const submitTo = (toStatus: string) => {
    if (!toInputRef.current || !formRef.current) return;
    toInputRef.current.value = toStatus;
    formRef.current.requestSubmit();
  };

  const handleDimensionChange = (dim: AdminTripleDimension, target: string) => {
    if (triple[dim] === target) return;
    if (dim === "shipping" && target === "versandt") {
      const next = pickNextStatusForDimension(order, dim, target);
      if (next === "shipped") {
        setShipModalOpen(true);
        return;
      }
    }
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
        {shipState?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {shipState.error}
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
                  disabled={pending || shipPending || !canTransition}
                  aria-busy={pending || shipPending}
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

      {shipModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`ship-modal-title-${orderId}`}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg ring-1 ring-black/5">
            <h3 id={`ship-modal-title-${orderId}`} className="text-lg font-semibold text-[#111827]">
              Versand melden
            </h3>
            <p className="mt-1 text-sm text-[#6b7280]">
              Sendungsnummer und Dienstleister erfassen — die Kundin / der Kunde erhält Tracking und die Rechnung per
              E-Mail.
            </p>
            <form action={shipFormAction} className="mt-5 space-y-4">
              <input type="hidden" name="orderId" value={orderId} />
              <div>
                <label htmlFor={`ship-carrier-${orderId}`} className="mb-1 block text-sm font-medium text-[#374151]">
                  Versanddienst
                </label>
                <select
                  id={`ship-carrier-${orderId}`}
                  name="shippingCarrier"
                  required
                  className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  defaultValue="DHL"
                >
                  <option value="DHL">DHL</option>
                  <option value="DPD">DPD</option>
                  <option value="UPS">UPS</option>
                  <option value="Hermes">Hermes</option>
                </select>
              </div>
              <div>
                <label htmlFor={`ship-track-${orderId}`} className="mb-1 block text-sm font-medium text-[#374151]">
                  Sendungsnummer
                </label>
                <input
                  id={`ship-track-${orderId}`}
                  name="trackingNumber"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="z. B. 003404341610940159"
                  className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
                  onClick={() => setShipModalOpen(false)}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={shipPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
                >
                  {shipPending ? "Wird gespeichert…" : "Als versendet markieren"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
