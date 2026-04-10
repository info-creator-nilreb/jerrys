"use client";

import { useState } from "react";
import { LinkedPriceRow } from "@/app/admin/(dashboard)/products/linked-price-row";

function HelpIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-flex shrink-0 text-primary" aria-label={title}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
      </svg>
    </span>
  );
}

type Cents = number | null;

type Props = {
  defaultTaxPercent: number;
  mainGrossCents: number;
  mainNetCents: number;
  listGrossCents: Cents;
  listNetCents: Cents;
  low30GrossCents: Cents;
  low30NetCents: Cents;
  fieldErrors?: Record<string, string>;
};

export function ProductPricesSection({
  defaultTaxPercent,
  mainGrossCents,
  mainNetCents,
  listGrossCents,
  listNetCents,
  low30GrossCents,
  low30NetCents,
  fieldErrors = {},
}: Props) {
  const [tax, setTax] = useState(defaultTaxPercent === 7 ? 7 : 19);

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Preise</h2>
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 max-w-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <label htmlFor="taxRatePercent" className="text-xs font-medium text-[#6b7280]">
              Steuersatz <span className="text-primary">*</span>
            </label>
            <HelpIcon title="Umsatzsteuersatz für die Brutto-/Netto-Umrechnung." />
          </div>
          <input type="hidden" name="taxRatePercent" value={tax} />
          <select
            id="taxRatePercent"
            value={tax}
            onChange={(e) => setTax(Number(e.target.value))}
            className="max-w-xs rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          >
            <option value={19}>19 %</option>
            <option value={7}>7 %</option>
          </select>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <LinkedPriceRow
          taxPercent={tax}
          grossName="priceGrossEuro"
          netName="priceNetEuro"
          grossDefaultCents={mainGrossCents}
          netDefaultCents={mainNetCents}
          grossLabel={
            <>
              Preis (Brutto) <span className="text-primary">*</span>
            </>
          }
          netLabel={
            <>
              Preis (Netto) <span className="text-primary">*</span>
            </>
          }
          required
          grossError={fieldErrors.priceGrossEuro}
          netError={fieldErrors.priceNetEuro}
        />

        <LinkedPriceRow
          taxPercent={tax}
          grossName="listPriceGrossEuro"
          netName="listPriceNetEuro"
          grossDefaultCents={listGrossCents}
          netDefaultCents={listNetCents}
          grossLabel="Streichpreis (Brutto)"
          netLabel="Streichpreis (Netto)"
          grossPlaceholder="Bruttopreis eingeben …"
          netPlaceholder="Nettopreis eingeben …"
          helpOnGross="Optionaler Vergleichspreis (UVP o. Ä.)."
          grossError={fieldErrors.listPriceGrossEuro}
          netError={fieldErrors.listPriceNetEuro}
        />

        <LinkedPriceRow
          taxPercent={tax}
          grossName="lowest30GrossEuro"
          netName="lowest30NetEuro"
          grossDefaultCents={low30GrossCents}
          netDefaultCents={low30NetCents}
          grossLabel="Günstigster Preis (letzten 30 Tage, Brutto)"
          netLabel="Günstigster Preis (letzten 30 Tage, Netto)"
          helpOnGross="Für Hinweise gemäß Preisangabenverordnung, falls erforderlich."
          grossError={fieldErrors.lowest30GrossEuro}
          netError={fieldErrors.lowest30NetEuro}
        />
      </div>
    </section>
  );
}
