"use client";

import { DELIVERY_TIME_OPTIONS } from "@/lib/catalog/delivery-options";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

type Props = {
  state: ProductFormState;
  defaults: {
    stockQuantity: number;
    deliveryTimeKey: string | null;
    restockDays: number | null;
    freeShipping: boolean;
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
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="stockQuantity" className="text-xs font-medium text-[#6b7280]">
            Lagerbestand
          </label>
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
          <span className="text-xs font-medium text-[#6b7280]">Verfügbarer Bestand</span>
          <input
            type="text"
            readOnly
            value={String(defaults.stockQuantity)}
            className="rounded-md border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2 text-sm text-[#6b7280]"
            aria-readonly
          />
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

        <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <input
              id="freeShipping"
              name="freeShipping"
              type="checkbox"
              defaultChecked={defaults.freeShipping}
              className="size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
            />
            <label htmlFor="freeShipping" className="text-sm font-medium text-[#374151]">
              Versandkostenfrei
            </label>
          </div>
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
