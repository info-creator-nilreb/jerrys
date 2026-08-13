"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import type { ProductAttribute } from "@/features/catalog";

type Row = {
  clientId: string;
  key: string;
  label: string;
  valuesText: string;
};

type Props = {
  state: ProductFormState;
  defaults: ProductAttribute[];
};

function toRows(attrs: ProductAttribute[]): Row[] {
  if (attrs.length === 0) return [];
  return attrs.map((a, i) => ({
    clientId: `attr-${i}-${a.key}`,
    key: a.key,
    label: a.label,
    valuesText: a.values.join(", "),
  }));
}

/**
 * Merkmale als einzelne Zeilen: sichtbares Label + Wert(e).
 * Shopify-/Import-Key bleibt im Hidden-Field für stabile Re-Imports.
 */
export function ProductAttributesFields({ state, defaults }: Props) {
  const baseId = useId();
  const fe = state?.fieldErrors ?? {};
  const [rows, setRows] = useState<Row[]>(() => toRows(defaults));

  function updateRow(clientId: string, patch: Partial<Omit<Row, "clientId">>) {
    setRows((prev) =>
      prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)),
    );
  }

  function removeRow(clientId: string) {
    setRows((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        clientId: `new-${Date.now()}`,
        key: "",
        label: "",
        valuesText: "",
      },
    ]);
  }

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1f2937]">Merkmale</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Strukturierte Produktangaben (Herkunft, Farbe, Größe …) als Label/Wert für die
            Produktdetails. Kurze Werbeaussagen gehören unter Verkaufsargumente / USPs — nicht hier
            als Stichpunkte duplizieren.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#1f2937] hover:bg-[#f9fafb]"
        >
          <Plus className="size-4" aria-hidden />
          Merkmal hinzufügen
        </button>
      </div>

      <div className="mt-6 h-px bg-[#e8eaed]" />

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#6b7280]">
          Noch keine Merkmale. Beim Shopify-Import werden sie automatisch übernommen.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          <li className="hidden gap-3 px-1 text-xs font-medium text-[#6b7280] sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
            <span>Label</span>
            <span>Wert(e)</span>
            <span className="sr-only">Entfernen</span>
          </li>
          {rows.map((row, index) => {
            const labelId = `${baseId}-label-${row.clientId}`;
            const valuesId = `${baseId}-values-${row.clientId}`;
            return (
              <li
                key={row.clientId}
                className="grid grid-cols-1 gap-2 rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end sm:gap-3"
              >
                <input type="hidden" name="attributeKey" value={row.key} />
                <div className="flex flex-col gap-1">
                  <label htmlFor={labelId} className="text-xs font-medium text-[#6b7280] sm:sr-only">
                    Label
                  </label>
                  <input
                    id={labelId}
                    name="attributeLabel"
                    type="text"
                    maxLength={120}
                    value={row.label}
                    onChange={(e) => updateRow(row.clientId, { label: e.target.value })}
                    placeholder="z. B. Farbe"
                    className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    aria-label={`Merkmal ${index + 1} Label`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={valuesId} className="text-xs font-medium text-[#6b7280] sm:sr-only">
                    Wert(e)
                  </label>
                  <input
                    id={valuesId}
                    name="attributeValues"
                    type="text"
                    maxLength={500}
                    value={row.valuesText}
                    onChange={(e) => updateRow(row.clientId, { valuesText: e.target.value })}
                    placeholder="z. B. beige, schwarz, gold"
                    className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                    aria-label={`Merkmal ${index + 1} Werte`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.clientId)}
                  className="inline-flex size-10 items-center justify-center self-end rounded-md text-[#6b7280] hover:bg-white hover:text-red-700"
                  aria-label={`Merkmal ${index + 1} entfernen`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {fe.attributes ? <p className="mt-3 text-sm text-red-600">{fe.attributes}</p> : null}
      <p className="mt-4 text-xs text-[#6b7280]">
        Mehrere Werte kommagetrennt. Maximal 40 Merkmale.
      </p>
    </section>
  );
}
