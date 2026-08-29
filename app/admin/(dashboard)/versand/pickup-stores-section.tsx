"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { PickupStoreRecord } from "@/lib/shop/pickup-store-shared";
import { listIsoCountryOptions } from "@/lib/catalog/iso-countries-de";

type Row = PickupStoreRecord & { clientId: string };

type Props = {
  defaults: PickupStoreRecord[];
  fieldErrors?: Record<string, string>;
};

function toRows(stores: PickupStoreRecord[]): Row[] {
  return stores.map((s) => ({ ...s, clientId: s.id }));
}

export function PickupStoresSection({ defaults, fieldErrors }: Props) {
  const baseId = useId();
  const fe = fieldErrors ?? {};
  const [rows, setRows] = useState<Row[]>(() =>
    defaults.length > 0 ? toRows(defaults) : [],
  );
  const countries = listIsoCountryOptions();

  function updateRow(clientId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  }

  function removeRow(clientId: string) {
    setRows((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        clientId: `new-${Date.now()}`,
        id: "",
        name: "",
        line1: "",
        line2: null,
        zip: "",
        city: "",
        country: "DE",
        infoUrl: null,
        isActive: true,
        sortOrder: prev.length,
      },
    ]);
  }

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1f2937]">Abholorte</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Zentral gepflegte Stores für Abholung im Checkout und auf der Produktseite. Pro Produkt
            wählst du den Abholort und die Fertigstellungsdauer.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#1f2937] hover:bg-[#f9fafb]"
        >
          <Plus className="size-4" aria-hidden />
          Abholort hinzufügen
        </button>
      </div>

      {fe.pickupStores ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {fe.pickupStores}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#6b7280]">
          Noch keine Abholorte. Mindestens einen Store anlegen, um Abholung an Produkten anzubieten.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {rows.map((row, index) => {
            const prefix = `${baseId}-${row.clientId}`;
            return (
              <li
                key={row.clientId}
                className="rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-4"
              >
                <input type="hidden" name="pickupStoreId" value={row.id} />
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#374151]">Abholort {index + 1}</p>
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                      <input type="hidden" name="pickupStoreActive" value={row.isActive ? "on" : "off"} />
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) => updateRow(row.clientId, { isActive: e.target.checked })}
                        className="size-4 checkbox-primary"
                      />
                      Aktiv
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRow(row.clientId)}
                      className="inline-flex size-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-white hover:text-red-700"
                      aria-label={`Abholort ${index + 1} entfernen`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label htmlFor={`${prefix}-name`} className="text-xs font-medium text-[#6b7280]">
                      Name <span className="text-primary">*</span>
                    </label>
                    <input
                      id={`${prefix}-name`}
                      name="pickupStoreName"
                      required
                      value={row.name}
                      onChange={(e) => updateRow(row.clientId, { name: e.target.value })}
                      placeholder="z. B. jerry's Store Berlin"
                      className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label htmlFor={`${prefix}-line1`} className="text-xs font-medium text-[#6b7280]">
                      Straße & Hausnummer <span className="text-primary">*</span>
                    </label>
                    <input
                      id={`${prefix}-line1`}
                      name="pickupStoreLine1"
                      required
                      value={row.line1}
                      onChange={(e) => updateRow(row.clientId, { line1: e.target.value })}
                      className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label htmlFor={`${prefix}-line2`} className="text-xs font-medium text-[#6b7280]">
                      Adresszusatz
                    </label>
                    <input
                      id={`${prefix}-line2`}
                      name="pickupStoreLine2"
                      value={row.line2 ?? ""}
                      onChange={(e) => updateRow(row.clientId, { line2: e.target.value || null })}
                      className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${prefix}-zip`} className="text-xs font-medium text-[#6b7280]">
                      PLZ <span className="text-primary">*</span>
                    </label>
                    <input
                      id={`${prefix}-zip`}
                      name="pickupStoreZip"
                      required
                      value={row.zip}
                      onChange={(e) => updateRow(row.clientId, { zip: e.target.value })}
                      className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${prefix}-city`} className="text-xs font-medium text-[#6b7280]">
                      Ort <span className="text-primary">*</span>
                    </label>
                    <input
                      id={`${prefix}-city`}
                      name="pickupStoreCity"
                      required
                      value={row.city}
                      onChange={(e) => updateRow(row.clientId, { city: e.target.value })}
                      className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${prefix}-country`} className="text-xs font-medium text-[#6b7280]">
                      Land
                    </label>
                    <select
                      id={`${prefix}-country`}
                      name="pickupStoreCountry"
                      value={row.country}
                      onChange={(e) => updateRow(row.clientId, { country: e.target.value })}
                      className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${prefix}-info`} className="text-xs font-medium text-[#6b7280]">
                      Info-Link (optional)
                    </label>
                    <input
                      id={`${prefix}-info`}
                      name="pickupStoreInfoUrl"
                      value={row.infoUrl ?? ""}
                      onChange={(e) => updateRow(row.clientId, { infoUrl: e.target.value || null })}
                      placeholder="/kontakt oder https://…"
                      className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
