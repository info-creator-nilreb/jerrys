"use client";

import { ProductDescriptionEditor } from "@/app/admin/(dashboard)/products/description-editor";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

function RequiredStar() {
  return <span className="text-primary">*</span>;
}

function InfoIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-flex text-primary" aria-label={title}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
      </svg>
    </span>
  );
}

type Mfr = { id: string; name: string };

type Props = {
  state: ProductFormState;
  manufacturers: Mfr[];
  defaults: {
    title: string;
    slug: string;
    subtitle: string;
    descriptionHtml: string;
    manufacturerId: string | null;
    productNumber: string | null;
    amazonRatingAverage: string;
    amazonRatingCount: string;
    amazonReviewUrl: string;
  };
};

export function ProductGeneralFields({ state, manufacturers, defaults }: Props) {
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Allgemeine Informationen</h2>
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-xs font-medium text-[#6b7280]">
            Name <RequiredStar />
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={defaults.title}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.title ? <p className="text-sm text-red-600">{fe.title}</p> : null}
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="flex flex-col gap-1">
            <label htmlFor="manufacturerId" className="text-xs font-medium text-[#6b7280]">
              Hersteller
            </label>
            <select
              id="manufacturerId"
              name="manufacturerId"
              defaultValue={defaults.manufacturerId ?? ""}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="productNumber" className="text-xs font-medium text-[#6b7280]">
                Produktnummer
              </label>
              <InfoIcon title="Interne oder Hersteller-Artikelnummer." />
            </div>
            <input
              id="productNumber"
              name="productNumber"
              type="text"
              defaultValue={defaults.productNumber ?? ""}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="slug" className="text-xs font-medium text-[#6b7280]">
            URL-Slug <RequiredStar />
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            placeholder="z. B. design-katzenhoehle"
            defaultValue={defaults.slug}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.slug ? <p className="text-sm text-red-600">{fe.slug}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="subtitle" className="text-xs font-medium text-[#6b7280]">
            Untertitel (optional)
          </label>
          <input
            id="subtitle"
            name="subtitle"
            type="text"
            defaultValue={defaults.subtitle}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.subtitle ? <p className="text-sm text-red-600">{fe.subtitle}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#6b7280]">Beschreibung</span>
          <ProductDescriptionEditor
            name="descriptionHtml"
            defaultHtml={defaults.descriptionHtml}
            error={fe.descriptionHtml}
          />
        </div>

        <div className="rounded-lg border border-dashed border-[#e5e7eb] bg-[#fafafa] p-4">
          <p className="text-xs font-medium text-[#374151]">Amazon-Bewertung (optional)</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Sterne und Anzahl gemeinsam eintragen oder beide leer lassen. Werte werden nicht automatisch von Amazon
            geladen.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="amazonRatingAverage" className="text-xs font-medium text-[#6b7280]">
                Durchschnitt (0–5)
              </label>
              <input
                id="amazonRatingAverage"
                name="amazonRatingAverage"
                type="text"
                inputMode="decimal"
                placeholder="z. B. 4,8"
                defaultValue={defaults.amazonRatingAverage}
                className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
              />
              {fe.amazonRatingAverage ? (
                <p className="text-sm text-red-600">{fe.amazonRatingAverage}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="amazonRatingCount" className="text-xs font-medium text-[#6b7280]">
                Anzahl Bewertungen
              </label>
              <input
                id="amazonRatingCount"
                name="amazonRatingCount"
                type="text"
                inputMode="numeric"
                placeholder="z. B. 29"
                defaultValue={defaults.amazonRatingCount}
                className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
              />
              {fe.amazonRatingCount ? <p className="text-sm text-red-600">{fe.amazonRatingCount}</p> : null}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <label htmlFor="amazonReviewUrl" className="text-xs font-medium text-[#6b7280]">
              Link zur Amazon-Produktseite (optional)
            </label>
            <input
              id="amazonReviewUrl"
              name="amazonReviewUrl"
              type="url"
              placeholder="https://www.amazon.de/…/dp/…"
              defaultValue={defaults.amazonReviewUrl}
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            />
            {fe.amazonReviewUrl ? <p className="text-sm text-red-600">{fe.amazonReviewUrl}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
