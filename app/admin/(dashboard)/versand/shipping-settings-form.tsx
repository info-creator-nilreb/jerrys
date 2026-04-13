"use client";

import { useActionState } from "react";
import {
  saveShopShippingSettings,
  shippingCountryOptionsForAdmin,
  type ShippingSettingsFormState,
  type ShopShippingSettingsForAdminForm,
} from "@/app/admin/(dashboard)/versand/actions";
import { AdminFormActionDock } from "@/components/admin/admin-form-action-dock";
import { centsToPriceInputString } from "@/lib/catalog/format";

const initial: ShippingSettingsFormState = null;

const inputClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const saveBtnClass =
  "shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50";

type Props = {
  defaults: ShopShippingSettingsForAdminForm;
};

export function ShippingSettingsForm({ defaults }: Props) {
  const [state, formAction, pending] = useActionState(saveShopShippingSettings, initial);

  const fe = state?.fieldErrors ?? {};
  const rates = defaults.shippingRatesCentsByCountry;
  const freeCents = defaults.freeShippingFromSubtotalGrossCents;

  return (
    <form action={formAction} className="space-y-8">
      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#1f2937]">Lieferländer</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
          Nur ausgewählte Länder erscheinen im Checkout. Versandkosten pro Land unten in Brutto (inkl. MwSt.).
        </p>
        <fieldset className="mt-4">
          <legend className="sr-only">Aktive Versandländer</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {shippingCountryOptionsForAdmin().map((o) => (
              <label key={o.code} className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  name="shippingCountryCodes"
                  value={o.code}
                  defaultChecked={defaults.shippingCountryCodes.includes(o.code)}
                  className="size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
                />
                {o.label}
              </label>
            ))}
          </div>
          {fe.shippingCountryCodes ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {fe.shippingCountryCodes}
            </p>
          ) : null}
        </fieldset>
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#1f2937]">Versandkosten (Brutto je Bestellung)</h2>
        <p className="mt-2 text-xs text-[#6b7280]">
          Pro Land ein Pauschalbetrag (z. B. „4,99“). Länder ohne aktivierte Checkbox werden ignoriert.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {shippingCountryOptionsForAdmin().map((o) => {
            const key = `rateEuro__${o.code}`;
            const cents = rates[o.code] ?? 0;
            return (
              <div key={o.code} className="flex flex-col gap-1">
                <label htmlFor={key} className="text-xs font-medium text-[#6b7280]">
                  {o.label} ({o.code})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={key}
                    name={key}
                    type="text"
                    inputMode="decimal"
                    defaultValue={centsToPriceInputString(cents)}
                    placeholder="0,00"
                    className={inputClass}
                  />
                  <span className="text-sm text-[#6b7280]">€</span>
                </div>
                {fe[key] ? (
                  <p className="text-sm text-red-600" role="alert">
                    {fe[key]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#1f2937]">Kostenloser Versand ab Warenwert</h2>
        <p className="mt-2 text-xs text-[#6b7280]">
          Optional: ab diesem Brutto-Warenkorb entfällt der Versand. Leer lassen, wenn es keine Staffel gibt.
        </p>
        <div className="mt-4 max-w-xs">
          <label htmlFor="freeShippingFromSubtotalEuro" className="text-xs font-medium text-[#6b7280]">
            Ab Brutto (€)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="freeShippingFromSubtotalEuro"
              name="freeShippingFromSubtotalEuro"
              type="text"
              inputMode="decimal"
              defaultValue={freeCents != null ? centsToPriceInputString(freeCents) : ""}
              placeholder="—"
              className={inputClass}
            />
            <span className="text-sm text-[#6b7280]">€</span>
          </div>
          {fe.freeShippingFromSubtotalEuro ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {fe.freeShippingFromSubtotalEuro}
            </p>
          ) : null}
        </div>
      </section>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm font-medium text-primary" role="status">
          Gespeichert.
        </p>
      ) : null}

      <AdminFormActionDock>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button type="submit" disabled={pending} className={saveBtnClass}>
            {pending ? "Speichern …" : "Speichern"}
          </button>
        </div>
      </AdminFormActionDock>
    </form>
  );
}
