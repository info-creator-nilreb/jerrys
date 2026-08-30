"use client";

import Link from "next/link";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import type { PickupStoreRecord } from "@/lib/shop/pickup-store-shared";
import { DEFAULT_PICKUP_READY_HOURS } from "@/lib/shop/pickup-store-shared";

type Defaults = {
  showWorkshopCalendar: boolean;
  pickupStoreId: string | null;
  pickupReadyHours: number | null;
};

type Props = {
  state: ProductFormState;
  defaults: Defaults;
  pickupStores: PickupStoreRecord[];
};

export function ProductStorefrontDetailFields({ state, defaults, pickupStores }: Props) {
  const fe = state?.fieldErrors ?? {};
  const hasPickupStores = pickupStores.length > 0;
  const readyHoursDefault =
    defaults.pickupReadyHours != null
      ? String(defaults.pickupReadyHours)
      : String(DEFAULT_PICKUP_READY_HOURS);

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Shop-Verhalten</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Optionen für Checkout und Produktdetailseite. Das Bestseller-Badge wird automatisch aus
        Verkäufen der letzten 90 Tage vergeben (Top-Anteil mit Mindestmenge). Abholorte pflegst du
        unter{" "}
        <Link href="/admin/versand" className="font-medium text-primary hover:underline">
          Versand → Abholorte
        </Link>
        .
      </p>
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 flex flex-col gap-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="showWorkshopCalendar"
            value="on"
            defaultChecked={defaults.showWorkshopCalendar}
            className="mt-1 size-4 checkbox-primary"
          />
          <span>
            <span className="text-sm font-medium text-[#1f2937]">
              Kompakte Terminliste auf Produktseite
            </span>
            <span className="mt-0.5 block text-xs text-[#6b7280]">
              Schlanke Liste (Datum + freie Plätze). Details und Buchung erst auf der Terminseite.
            </span>
          </span>
        </label>
        {fe.showWorkshopCalendar ? (
          <p className="text-sm text-red-600">{fe.showWorkshopCalendar}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="pickupStoreId" className="text-sm font-medium text-[#1f2937]">
              Abholung
            </label>
            <select
              id="pickupStoreId"
              name="pickupStoreId"
              defaultValue={defaults.pickupStoreId ?? ""}
              disabled={!hasPickupStores}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-[#f3f4f6]"
            >
              <option value="">Keine Abholung</option>
              {pickupStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                  {!store.isActive ? " (inaktiv)" : ""}
                  {store.city ? ` — ${store.city}` : ""}
                </option>
              ))}
            </select>
            {!hasPickupStores ? (
              <p className="text-xs text-[#6b7280]">
                Zuerst mindestens einen aktiven Abholort unter Versand anlegen.
              </p>
            ) : (
              <p className="text-xs text-[#6b7280]">
                Zeigt einen Abhol-Hinweis auf der Produktseite und aktiviert Abholung im Checkout,
                wenn alle Warenkorb-Artikel einen Abholort haben.
              </p>
            )}
            {fe.pickupStoreId ? <p className="text-sm text-red-600">{fe.pickupStoreId}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pickupReadyHours" className="text-sm font-medium text-[#1f2937]">
              Fertigstellung (Stunden)
            </label>
            <input
              id="pickupReadyHours"
              name="pickupReadyHours"
              type="number"
              min={1}
              max={168}
              step={1}
              defaultValue={readyHoursDefault}
              placeholder={String(DEFAULT_PICKUP_READY_HOURS)}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs text-[#6b7280]">
              Standard: {DEFAULT_PICKUP_READY_HOURS} Stunden. Gilt nur, wenn ein Abholort gewählt
              ist.
            </p>
            {fe.pickupReadyHours ? (
              <p className="text-sm text-red-600">{fe.pickupReadyHours}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
