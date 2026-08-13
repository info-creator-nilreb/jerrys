"use client";

import { Heart, Leaf, PawPrint, Plus, Shield, Sparkles, Tag, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import {
  iconForUspText,
  MAX_PRODUCT_USPS,
  pickDistinctUspIcon,
  type UspIconName,
} from "@/lib/catalog/usp-icons";

type Row = {
  clientId: string;
  text: string;
};

type Props = {
  state: ProductFormState;
  /** Eine Zeile pro USP. Parent remountet bei KI-Übernahme via `key`. */
  defaults: string[];
};

function toRows(lines: string[]): Row[] {
  return lines
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_USPS)
    .map((text, i) => ({
      clientId: `usp-${i}-${text.slice(0, 24)}`,
      text,
    }));
}

function UspPreviewIcon({ name }: { name: UspIconName }) {
  const props = {
    className: "size-4 text-primary",
    strokeWidth: 1.75 as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "flag-de":
      return (
        <span
          className="inline-flex h-4 w-5 flex-col overflow-hidden rounded-[2px] border border-[#e5e7eb]"
          aria-hidden
        >
          <span className="h-1/3 w-full bg-black" />
          <span className="h-1/3 w-full bg-[#DD0000]" />
          <span className="h-1/3 w-full bg-[#FFCE00]" />
        </span>
      );
    case "paw":
      return <PawPrint {...props} />;
    case "leaf":
      return <Leaf {...props} />;
    case "heart":
      return <Heart {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "gem":
      return <Sparkles {...props} />;
    case "tag":
      return <Tag {...props} />;
    case "sparkles":
    default:
      return <Sparkles {...props} />;
  }
}

function previewIconsForRows(rows: Row[]): UspIconName[] {
  const used = new Set<UspIconName>();
  return rows.map((row) => {
    const icon = row.text.trim()
      ? pickDistinctUspIcon(row.text, "general", used)
      : iconForUspText("", "general");
    if (row.text.trim()) used.add(icon);
    return icon;
  });
}

/**
 * Verkaufsargumente / USPs — max. 3 Zeilen (= PDP), Icons per Keyword-Heuristik (keine KI).
 */
export function ProductUspFields({ state, defaults }: Props) {
  const baseId = useId();
  const fe = state?.fieldErrors ?? {};
  const [rows, setRows] = useState<Row[]>(() => toRows(defaults));
  const previewIcons = previewIconsForRows(rows);

  function updateRow(clientId: string, text: string) {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, text } : r)));
  }

  function removeRow(clientId: string) {
    setRows((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  function addRow() {
    if (rows.length >= MAX_PRODUCT_USPS) return;
    setRows((prev) => [...prev, { clientId: `new-${Date.now()}`, text: "" }]);
  }

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1f2937]">Verkaufsargumente (USPs)</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Maximal {MAX_PRODUCT_USPS} Claims — genau so viele wie auf der Produktdetailseite.
            Icons werden automatisch aus dem Text gewählt (Stichworte wie „pflege“, „stabil“,
            „sicher“); keine KI nötig. Keine Fakten wie Farbe/Herkunft (das sind Merkmale).
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_PRODUCT_USPS}
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
            const icon = previewIcons[index] ?? "sparkles";
            return (
              <li
                key={row.clientId}
                className="flex items-end gap-2 rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-3"
              >
                <span
                  className="mb-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white"
                  title="Vorschau-Icon für die Shop-Ansicht"
                >
                  <UspPreviewIcon name={icon} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <label htmlFor={inputId} className="text-xs font-medium text-[#6b7280]">
                    USP {index + 1} von {MAX_PRODUCT_USPS}
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
        Was du hier einträgst, erscheint 1:1 als USP-Zeile im Shop. „Made in Germany“ wird nur
        ergänzt, wenn noch ein freier Platz bleibt.
      </p>
    </section>
  );
}
