"use client";

import { ChevronDown, CircleQuestionMark } from "lucide-react";
import { ProductDescriptionEditor } from "@/app/admin/(dashboard)/products/description-editor";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import { AdminSlugField } from "@/components/admin/admin-slug-field";
import { useAutoSlugFromTitle } from "@/components/admin/use-auto-slug-from-title";

function RequiredStar() {
  return <span className="text-primary">*</span>;
}

function InfoIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-flex text-primary" aria-label={title}>
      <CircleQuestionMark width={16} height={16} aria-hidden strokeWidth={2} />
    </span>
  );
}

function hasAmazonFormContent(defaults: Props["defaults"], fe: Record<string, string>): boolean {
  return Boolean(
    defaults.amazonRatingAverage.trim() ||
      defaults.amazonRatingCount.trim() ||
      defaults.amazonReviewUrl.trim() ||
      fe.amazonRatingAverage ||
      fe.amazonRatingCount ||
      fe.amazonReviewUrl,
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
    /** Remount-Key wenn KI-Beschreibung übernommen wird. */
    descriptionKey?: number;
    manufacturerId: string | null;
    productNumber: string | null;
    /** SKU der Default-Variante (bearbeitbar). */
    sku: string | null;
    leadText: string;
    leadTextKey?: number;
    amazonRatingAverage: string;
    amazonRatingCount: string;
    amazonReviewUrl: string;
  };
};

export function ProductGeneralFields({ state, manufacturers, defaults }: Props) {
  const fe = state?.fieldErrors ?? {};
  const amazonExpanded = hasAmazonFormContent(defaults, fe);
  const {
    title,
    setTitle,
    slug,
    setSlug,
    slugManuallyEdited,
    regenerateSlugFromTitle,
  } = useAutoSlugFromTitle({
    initialTitle: defaults.title,
    initialSlug: defaults.slug,
    mode: "catalog",
  });

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.title ? <p className="text-sm text-red-600">{fe.title}</p> : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="manufacturerId" className="text-xs font-medium text-[#6b7280]">
              Hersteller
            </label>
            <select
              id="manufacturerId"
              name="manufacturerId"
              defaultValue={defaults.manufacturerId ?? ""}
              className="box-border min-h-[44px] w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-[10px] text-sm leading-normal text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1"
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
              <InfoIcon title="Interne oder Hersteller-Artikelnummer (nicht zwingend die Verkaufs-SKU)." />
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
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="sku" className="text-xs font-medium text-[#6b7280]">
              SKU (Standard-Variante)
            </label>
            <InfoIcon title="Eindeutige Verkaufs-SKU der Standard-Variante. Weitere Varianten-SKUs bearbeitest du unten bei Varianten." />
          </div>
          <input
            id="sku"
            name="sku"
            type="text"
            maxLength={64}
            placeholder="z. B. KH-50-GR"
            defaultValue={defaults.sku ?? ""}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-sm"
          />
          <p className="text-xs text-[#6b7280]">
            Leer lassen, um aus der Produktnummer (oder einer stabilen Fallback-SKU) abzuleiten.
          </p>
          {fe.sku ? <p className="text-sm text-red-600">{fe.sku}</p> : null}
        </div>

        <AdminSlugField
          id="slug"
          name="slug"
          slug={slug}
          onSlugChange={setSlug}
          slugManuallyEdited={slugManuallyEdited}
          onRegenerateFromTitle={regenerateSlugFromTitle}
          error={fe.slug}
          hint="Storefront: /produkte/[slug]"
        />

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
          <label htmlFor="leadText" className="text-xs font-medium text-[#6b7280]">
            Kurzbeschreibung (optional, SEO & Einleitung)
          </label>
          <textarea
            key={defaults.leadTextKey ?? 0}
            id="leadText"
            name="leadText"
            rows={3}
            maxLength={500}
            defaultValue={defaults.leadText}
            placeholder="2–3 Sätze — erscheint unter dem Titel und in Meta-Beschreibungen."
            className="resize-y rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
          />
          {fe.leadText ? <p className="text-sm text-red-600">{fe.leadText}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#6b7280]">Beschreibung</span>
          <ProductDescriptionEditor
            key={defaults.descriptionKey ?? 0}
            name="descriptionHtml"
            defaultHtml={defaults.descriptionHtml}
            error={fe.descriptionHtml}
          />
        </div>

        <details
          open={amazonExpanded}
          className="group rounded-lg border border-dashed border-[#e5e7eb] bg-[#fafafa]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-xs font-medium text-[#374151]">Amazon-Bewertung (optional)</p>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Manuell gepflegte Sterne — wird nicht automatisch von Amazon geladen.
              </p>
            </div>
            <ChevronDown
              className="size-4 shrink-0 text-[#6b7280] transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-[#e8eaed] px-4 pb-4 pt-3">
            <p className="text-xs text-[#6b7280]">
              Sterne und Anzahl gemeinsam eintragen oder beide leer lassen.
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
        </details>
      </div>
    </section>
  );
}
