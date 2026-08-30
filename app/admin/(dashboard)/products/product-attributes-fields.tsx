"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import type { ProductAttribute } from "@/features/catalog";
import { countryDisplayName, listIsoCountryOptions } from "@/lib/catalog/iso-countries-de";
import {
  customAttributesOnly,
  findOriginRawValue,
  migrateLegacySpecsIntoAttributes,
  readStandardSpecValues,
  STANDARD_SPEC_LABELS,
  type StandardSpecValues,
} from "@/lib/catalog/standard-product-attributes";

type Row = {
  clientId: string;
  key: string;
  label: string;
  valuesText: string;
};

type Props = {
  state: ProductFormState;
  defaults: ProductAttribute[];
  legacySpecs?: {
    dimensionsText?: string | null;
    weightText?: string | null;
    materialText?: string | null;
  };
};

function toCustomRows(attrs: ProductAttribute[]): Row[] {
  return customAttributesOnly(attrs).map((a, i) => ({
    clientId: `attr-${i}-${a.key}`,
    key: a.key,
    label: a.label,
    valuesText: a.values.join(", "),
  }));
}

export function ProductAttributesFields({ state, defaults, legacySpecs }: Props) {
  const baseId = useId();
  const fe = state?.fieldErrors ?? {};
  const mergedDefaults = useMemo(
    () => migrateLegacySpecsIntoAttributes(defaults, legacySpecs),
    [defaults, legacySpecs],
  );
  const initialSpecs = useMemo(
    () => readStandardSpecValues(mergedDefaults, legacySpecs),
    [mergedDefaults, legacySpecs],
  );
  const originRaw = useMemo(() => findOriginRawValue(mergedDefaults), [mergedDefaults]);
  const [syncedDefaults, setSyncedDefaults] = useState(mergedDefaults);
  const [specs, setSpecs] = useState<StandardSpecValues>(initialSpecs);
  const [rows, setRows] = useState<Row[]>(() => toCustomRows(mergedDefaults));

  if (mergedDefaults !== syncedDefaults) {
    setSyncedDefaults(mergedDefaults);
    setSpecs(initialSpecs);
    setRows(toCustomRows(mergedDefaults));
  }

  const countryOptions = useMemo(() => {
    const base = listIsoCountryOptions();
    const code = initialSpecs.originCountryCode;
    if (code && !base.some((c) => c.code === code)) {
      return [{ code, name: countryDisplayName(code) }, ...base];
    }
    return base;
  }, [initialSpecs.originCountryCode]);

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
            Standard-Fakten (Maße, Gewicht, Material, Herstellungsland) sind immer sichtbar. Weitere
            Merkmale optional ergänzen — Werbe-Claims gehören unter Verkaufsargumente.
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${baseId}-dimensions`} className="text-xs font-medium text-[#6b7280]">
            {STANDARD_SPEC_LABELS.dimensions}
          </label>
          <input
            id={`${baseId}-dimensions`}
            name="standardDimensions"
            type="text"
            maxLength={500}
            value={specs.dimensions}
            onChange={(e) => setSpecs((s) => ({ ...s, dimensions: e.target.value }))}
            placeholder="z. B. ca. 50 × 40 × 35 cm"
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${baseId}-weight`} className="text-xs font-medium text-[#6b7280]">
            {STANDARD_SPEC_LABELS.weight}
          </label>
          <input
            id={`${baseId}-weight`}
            name="standardWeight"
            type="text"
            maxLength={500}
            value={specs.weight}
            onChange={(e) => setSpecs((s) => ({ ...s, weight: e.target.value }))}
            placeholder="z. B. ca. 2,1 kg"
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label htmlFor={`${baseId}-material`} className="text-xs font-medium text-[#6b7280]">
            {STANDARD_SPEC_LABELS.material}
          </label>
          <input
            id={`${baseId}-material`}
            name="standardMaterial"
            type="text"
            maxLength={500}
            value={specs.material}
            onChange={(e) => setSpecs((s) => ({ ...s, material: e.target.value }))}
            placeholder="z. B. Resin, Edelstahl"
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label htmlFor={`${baseId}-origin`} className="text-xs font-medium text-[#6b7280]">
            {STANDARD_SPEC_LABELS.origin}
          </label>
          <select
            id={`${baseId}-origin`}
            name="standardOriginCountry"
            value={specs.originCountryCode}
            onChange={(e) => setSpecs((s) => ({ ...s, originCountryCode: e.target.value }))}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          >
            <option value="">— nicht angegeben —</option>
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          {originRaw && !specs.originCountryCode ? (
            <p className="text-xs text-amber-800" role="status">
              Bestandswert „{originRaw}“ konnte keinem Land zugeordnet werden — bitte manuell wählen.
            </p>
          ) : null}
        </div>
      </div>

      {rows.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          <li className="hidden gap-3 px-1 text-xs font-medium text-[#6b7280] sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
            <span>Weiteres Merkmal</span>
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
                    placeholder="z. B. beige, schwarz"
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
      ) : (
        <p className="mt-6 text-sm text-[#6b7280]">
          Keine zusätzlichen Merkmale. Beim Shopify-Import werden sie automatisch übernommen.
        </p>
      )}

      {fe.attributes ? <p className="mt-3 text-sm text-red-600">{fe.attributes}</p> : null}
      <p className="mt-4 text-xs text-[#6b7280]">
        Zusätzliche Merkmale: Werte kommagetrennt. Maximal 40 Merkmale gesamt.
      </p>
    </section>
  );
}
