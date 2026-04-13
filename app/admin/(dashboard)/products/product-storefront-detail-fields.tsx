"use client";

import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

type Defaults = {
  categoryTag: string;
  isBestseller: boolean;
  leadText: string;
  dimensionsText: string;
  weightText: string;
  materialText: string;
  featureBullets: string;
};

type Props = {
  state: ProductFormState;
  defaults: Defaults;
};

export function ProductStorefrontDetailFields({ state, defaults }: Props) {
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Produktdetail (Shop)</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Felder für die Produktdetailseite: Kategoriezeile, Kurztext, technische Kurzinfos und Stichpunkte.
      </p>
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 flex flex-col gap-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="isBestseller"
            value="on"
            defaultChecked={defaults.isBestseller}
            className="mt-1 size-4 rounded border-[#e5e7eb] text-primary focus:ring-primary"
          />
          <span>
            <span className="text-sm font-medium text-[#1f2937]">Bestseller-Badge</span>
            <span className="mt-0.5 block text-xs text-[#6b7280]">
              Zeigt ein „Bestseller“-Label auf der Produktseite und optional auf Karten.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-1">
          <label htmlFor="categoryTag" className="text-xs font-medium text-[#6b7280]">
            Kategorie- / Claim-Zeile (optional)
          </label>
          <input
            id="categoryTag"
            name="categoryTag"
            type="text"
            maxLength={120}
            placeholder="z. B. FÜR AUGE & GAUMEN"
            defaultValue={defaults.categoryTag}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.categoryTag ? <p className="text-sm text-red-600">{fe.categoryTag}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="leadText" className="text-xs font-medium text-[#6b7280]">
            Kurztext unter dem Untertitel (optional, kein HTML)
          </label>
          <textarea
            id="leadText"
            name="leadText"
            rows={3}
            maxLength={500}
            defaultValue={defaults.leadText}
            placeholder="2–3 Sätze zum Produkt …"
            className="resize-y rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.leadText ? <p className="text-sm text-red-600">{fe.leadText}</p> : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="dimensionsText" className="text-xs font-medium text-[#6b7280]">
              Maße (optional)
            </label>
            <input
              id="dimensionsText"
              name="dimensionsText"
              type="text"
              maxLength={500}
              placeholder="z. B. ca. 50 × 40 × 35 cm (B × T × H)"
              defaultValue={defaults.dimensionsText}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            />
            {fe.dimensionsText ? <p className="text-sm text-red-600">{fe.dimensionsText}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="weightText" className="text-xs font-medium text-[#6b7280]">
              Gewicht (optional)
            </label>
            <input
              id="weightText"
              name="weightText"
              type="text"
              maxLength={500}
              placeholder="z. B. ca. 2,1 kg"
              defaultValue={defaults.weightText}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            />
            {fe.weightText ? <p className="text-sm text-red-600">{fe.weightText}</p> : null}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="materialText" className="text-xs font-medium text-[#6b7280]">
            Material (optional)
          </label>
          <input
            id="materialText"
            name="materialText"
            type="text"
            maxLength={500}
            defaultValue={defaults.materialText}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.materialText ? <p className="text-sm text-red-600">{fe.materialText}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="featureBullets" className="text-xs font-medium text-[#6b7280]">
            Eigenschaften / Stichpunkte (optional, eine Zeile pro Punkt)
          </label>
          <textarea
            id="featureBullets"
            name="featureBullets"
            rows={5}
            defaultValue={defaults.featureBullets}
            placeholder={"Stabil & langlebig\nPflegeleicht abwischbar"}
            className="resize-y rounded-md border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-sm"
          />
          <p className="text-xs text-[#6b7280]">Maximal 20 Zeilen, je bis 200 Zeichen.</p>
        </div>
      </div>
    </section>
  );
}
