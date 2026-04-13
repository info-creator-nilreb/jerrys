"use client";

import { CircleQuestionMark } from "lucide-react";
import { useState } from "react";
import { LinkedPriceRow } from "@/app/admin/(dashboard)/products/linked-price-row";

function HelpIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-flex shrink-0 text-primary" aria-label={title}>
      <CircleQuestionMark width={16} height={16} aria-hidden strokeWidth={2} />
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
