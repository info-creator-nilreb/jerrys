"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

type Row = {
  clientId: string;
  text: string;
};

type Props = {
  state: ProductFormState;
  /** Eine Zeile pro USP. Parent remountet bei KI-Übernahme via `key`. */
  defaults: string[];
};

const MAX_USPS = 6;

function toRows(lines: string[]): Row[] {
  return lines
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_USPS)
    .map((text, i) => ({
      clientId: `usp-${i}-${text.slice(0, 24)}`,
      text,
    }));
}

/**
 * Verkaufsargumente / USPs — zeilenweise wie Merkmale, aber nur Text (kein Label/Wert).
 * Abgrenzung: Merkmale = Fakten für Produktdetails; USPs = kurze Claims für die Icon-Zeile.
 */
export function ProductUspFields({ state, defaults }: Props) {
  const baseId = useId();
  const fe = state?.fieldErrors ?? {};
  const [rows, setRows] = useState<Row[]>(() => toRows(defaults));

  function updateRow(clientId: string, text: string) {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, text } : r)));
  }

  function removeRow(clientId: string) {
    setRows((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  function addRow() {
    if (rows.length >= MAX_USPS) return;
    setRows((prev) => [
      ...prev,
      { clientId: `new-${Date.now()}`, text: "" },
    ]);
  }

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1f2937]">Verkaufsargumente (USPs)</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Kurze Werbe-Claims ohne Label — eine Aussage pro Zeile. Auf der Produktdetailseite als
            Icon-Zeile. Keine Fakten wie Farbe oder Herkunft (das sind{" "}
            <span className="font-medium text-[#374151]">Merkmale</span>).
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_USPS}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#1f2937] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          USP hinzufügen
        </button>
      </div>

      <div className="mt-6 h-px bg-[#e8eaed]" />

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#6b7280]">
          Noch keine USPs. Beispiele: „Stabil &amp; langlebig“, „Pflegeleicht abwischbar“.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((row, index) => {
            const inputId = `${baseId}-usp-${row.clientId}`;
            return (
              <li
                key={row.clientId}
                className="flex items-end gap-2 rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <label htmlFor={inputId} className="text-xs font-medium text-[#6b7280]">
                    USP {index + 1}
                  </label>
                  <input
                    id={inputId}
                    name="featureBullet"
                    type="text"
                    maxLength={200}
                    value={row.text}
                    onChange={(e) => updateRow(row.clientId, e.target.value)}
                    placeholder="z. B. Stabil & langlebig"
                    className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.clientId)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-[#6b7280] hover:bg-white hover:text-red-700"
                  aria-label={`USP ${index + 1} entfernen`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {fe.featureBullets ? <p className="mt-3 text-sm text-red-600">{fe.featureBullets}</p> : null}
      <p className="mt-4 text-xs text-[#6b7280]">
        Maximal {MAX_USPS} Einträge; auf der PDP werden bis zu 3 angezeigt (zzgl. Made in Germany /
        Theme, falls vorhanden).
      </p>
    </section>
  );
}
