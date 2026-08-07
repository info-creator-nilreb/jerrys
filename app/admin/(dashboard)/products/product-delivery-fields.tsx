"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { DELIVERY_TIME_OPTIONS } from "@/lib/catalog/delivery-options";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

type Props = {
  state: ProductFormState;
  defaults: {
    stockQuantity: number;
    availableQuantity: number;
    deliveryTimeKey: string | null;
    restockDays: number | null;
    minOrderQty: number;
    purchaseStep: number;
    maxOrderQty: number | null;
  };
};

const inputClass =
  "rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm";

function DeliveryFieldStack({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 lg:h-full">
      <div className="flex flex-col gap-1">
        <label htmlFor={htmlFor} className="text-xs font-medium text-[#6b7280]">
          {label}
        </label>
        {hint ? <p className="text-[11px] leading-snug text-[#9ca3af]">{hint}</p> : null}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        {children}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}

export function ProductDeliveryFields({ state, defaults }: Props) {
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Lieferbarkeit</h2>
      <p className="mt-2 text-xs text-[#6b7280]">
        Versandländer und Versandkosten werden unter{" "}
        <Link href="/admin/versand" className="font-medium text-primary hover:underline">
          Versand
        </Link>{" "}
        shopweit gepflegt.
      </p>
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
        <DeliveryFieldStack
          label="Lagerbestand (physikalisch)"
          htmlFor="stockQuantity"
          hint="Wird bei Status „Versandt“ je Bestellposition reduziert."
          error={fe.stockQuantity}
        >
          <input
            id="stockQuantity"
            name="stockQuantity"
            type="number"
            min={0}
            step={1}
            defaultValue={defaults.stockQuantity}
            className={inputClass}
          />
        </DeliveryFieldStack>

        <DeliveryFieldStack
          label="Verfügbarer Bestand (Shop)"
          htmlFor="availableQuantity"
          hint={
            <>
              Für Produktseite, Warenkorb und Checkout; wird bei Bestellaufgabe (Zahlung ausstehend) reserviert und bei
              Storno wieder freigegeben.
            </>
          }
          error={fe.availableQuantity}
        >
          <input
            id="availableQuantity"
            name="availableQuantity"
            type="number"
            min={0}
            step={1}
            defaultValue={defaults.availableQuantity}
            className={inputClass}
          />
        </DeliveryFieldStack>

        <div className="sm:col-span-2 lg:col-span-1 lg:h-full">
          <DeliveryFieldStack label="Lieferzeit" htmlFor="deliveryTimeKey">
            <select
              id="deliveryTimeKey"
              name="deliveryTimeKey"
              defaultValue={defaults.deliveryTimeKey ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {DELIVERY_TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </DeliveryFieldStack>
        </div>

        <DeliveryFieldStack label="Wiederauffüllzeit in Tagen" htmlFor="restockDays">
          <input
            id="restockDays"
            name="restockDays"
            type="number"
            min={0}
            step={1}
            defaultValue={defaults.restockDays ?? ""}
            placeholder="z. B. 21"
            className={inputClass}
          />
        </DeliveryFieldStack>

        <DeliveryFieldStack label="Mindestabnahme" htmlFor="minOrderQty" error={fe.minOrderQty}>
          <input
            id="minOrderQty"
            name="minOrderQty"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults.minOrderQty}
            className={inputClass}
          />
        </DeliveryFieldStack>

        <DeliveryFieldStack label="Staffelung" htmlFor="purchaseStep" error={fe.purchaseStep}>
          <input
            id="purchaseStep"
            name="purchaseStep"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults.purchaseStep}
            className={inputClass}
          />
        </DeliveryFieldStack>

        <DeliveryFieldStack label="Maximalabnahme" htmlFor="maxOrderQty" error={fe.maxOrderQty}>
          <input
            id="maxOrderQty"
            name="maxOrderQty"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults.maxOrderQty ?? ""}
            placeholder="Maximalabnahme …"
            className={inputClass}
          />
        </DeliveryFieldStack>
      </div>
    </section>
  );
}
