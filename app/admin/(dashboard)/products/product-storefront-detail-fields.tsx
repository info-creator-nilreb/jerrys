"use client";

import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

type Defaults = {
  showWorkshopCalendar: boolean;
  pickupAvailable: boolean;
};

type Props = {
  state: ProductFormState;
  defaults: Defaults;
};

export function ProductStorefrontDetailFields({ state, defaults }: Props) {
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Shop-Verhalten</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Optionen für Checkout und Produktdetailseite. Das Bestseller-Badge wird automatisch aus
        Verkäufen der letzten 90 Tage vergeben (Top-Anteil mit Mindestmenge).
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

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="pickupAvailable"
            value="on"
            defaultChecked={defaults.pickupAvailable}
            className="mt-1 size-4 checkbox-primary"
          />
          <span>
            <span className="text-sm font-medium text-[#1f2937]">Abholung möglich</span>
            <span className="mt-0.5 block text-xs text-[#6b7280]">
              Zeigt einen Abhol-Hinweis auf der Produktseite und aktiviert Abholung im Checkout für
              dieses Produkt (nur wenn alle Warenkorb-Artikel Abholung erlauben).
            </span>
          </span>
        </label>
        {fe.pickupAvailable ? (
          <p className="text-sm text-red-600">{fe.pickupAvailable}</p>
        ) : null}
      </div>
    </section>
  );
}
