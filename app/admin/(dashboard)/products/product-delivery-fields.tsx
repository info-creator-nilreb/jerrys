"use client";

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
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="stockQuantity" className="text-xs font-medium text-[#6b7280]">
            Lagerbestand (physikalisch)
          </label>
          <p className="text-[11px] leading-snug text-[#9ca3af]">
            Wird bei Status „Versandt“ je Bestellposition reduziert.
          </p>
          <input
            id="stockQuantity"
            name="stockQuantity"
            type="number"
            min={0}
            step={1}
            defaultValue={defaults.stockQuantity}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.stockQuantity ? <p className="text-sm text-red-600">{fe.stockQuantity}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="availableQuantity" className="text-xs font-medium text-[#6b7280]">
            Verfügbarer Bestand (Shop)
          </label>
          <p className="text-[11px] leading-snug text-[#9ca3af]">
            Für Produktseite, Warenkorb und Checkout; wird bei erfolgreicher Zahlung reduziert.
          </p>
          <input
            id="availableQuantity"
            name="availableQuantity"
            type="number"
            min={0}
            step={1}
            defaultValue={defaults.availableQuantity}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.availableQuantity ? <p className="text-sm text-red-600">{fe.availableQuantity}</p> : null}
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <label htmlFor="deliveryTimeKey" className="text-xs font-medium text-[#6b7280]">
            Lieferzeit
          </label>
          <select
            id="deliveryTimeKey"
            name="deliveryTimeKey"
            defaultValue={defaults.deliveryTimeKey ?? ""}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {DELIVERY_TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="restockDays" className="text-xs font-medium text-[#6b7280]">
            Wiederauffüllzeit in Tagen
          </label>
          <input
            id="restockDays"
            name="restockDays"
            type="number"
            min={0}
            step={1}
            defaultValue={defaults.restockDays ?? ""}
            placeholder="z. B. 21"
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="minOrderQty" className="text-xs font-medium text-[#6b7280]">
            Mindestabnahme
          </label>
          <input
            id="minOrderQty"
            name="minOrderQty"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults.minOrderQty}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.minOrderQty ? <p className="text-sm text-red-600">{fe.minOrderQty}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="purchaseStep" className="text-xs font-medium text-[#6b7280]">
            Staffelung
          </label>
          <input
            id="purchaseStep"
            name="purchaseStep"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults.purchaseStep}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.purchaseStep ? <p className="text-sm text-red-600">{fe.purchaseStep}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="maxOrderQty" className="text-xs font-medium text-[#6b7280]">
            Maximalabnahme
          </label>
          <input
            id="maxOrderQty"
            name="maxOrderQty"
            type="number"
            min={1}
            step={1}
            defaultValue={defaults.maxOrderQty ?? ""}
            placeholder="Maximalabnahme …"
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.maxOrderQty ? <p className="text-sm text-red-600">{fe.maxOrderQty}</p> : null}
        </div>
      </div>
    </section>
  );
}
