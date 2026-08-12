"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  rebuildSearchIndexAction,
  type SearchIndexAdminActionState,
} from "@/app/admin/(dashboard)/einstellungen/integrationen/search-index-actions";
import {
  formatIndexAgeLabel,
  indexAgeHours,
} from "@/features/catalog/domain/search-quality-metrics";

export type SearchIndexPanelProps = {
  embeddingConfigured: boolean;
  embeddingProvider: string | null;
  embeddingModel: string | null;
  documentsTotal: number;
  documentsIndexed: number;
  documentsPending: number;
  documentsError: number;
  documentsExcluded: number;
  activeProductsWithoutDocument: number;
  lastRebuildStartedAt: string | null;
  lastRebuildFinishedAt: string | null;
  lastRebuildError: string | null;
  operatorHint: string;
};

function formatDe(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SearchIndexPanel(props: SearchIndexPanelProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    rebuildSearchIndexAction,
    null as SearchIndexAdminActionState,
  );

  const indexAgeLabel = formatIndexAgeLabel(
    indexAgeHours(props.lastRebuildFinishedAt),
  );

  useEffect(() => {
    if (state?.ok || state?.error) {
      router.refresh();
    }
  }, [state?.ok, state?.error, router]);

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Search className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#1f2937]">Semantischer Suchindex</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Öffentliche Produktdokumente und Embeddings für die hybride Storefront-Suche
            (Epic 14). Keine Kundendaten. Typeahead bleibt lexikalisch; bei Index- oder
            Providerausfall fällt die Vollsuche auf die klassische Suche zurück.
          </p>
        </div>
      </div>

      <div aria-live="polite" className="mt-4 space-y-2">
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.message ? (
          <p
            className={`text-sm font-medium ${state.error ? "text-[#6b7280]" : "text-primary"}`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
        {props.lastRebuildError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Letzter Rebuild-Fehler: {props.lastRebuildError}
          </p>
        ) : null}
        <p className="rounded-md border border-[#e8eaed] bg-[#f9fafb] px-3 py-2 text-sm text-[#374151]">
          {props.operatorHint}
        </p>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#6b7280]">Embedding-Anbieter</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.embeddingConfigured
              ? `${props.embeddingProvider ?? "—"} / ${props.embeddingModel ?? "—"}`
              : "Nicht konfiguriert"}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Dokumente gesamt</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">{props.documentsTotal}</dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Indexiert</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">{props.documentsIndexed}</dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Ausstehend / Fehler / Ausgeschlossen</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.documentsPending} / {props.documentsError} / {props.documentsExcluded}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Aktive Produkte ohne Dokument</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {props.activeProductsWithoutDocument}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Letzter Rebuild</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">
            {formatDe(props.lastRebuildFinishedAt ?? props.lastRebuildStartedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-[#6b7280]">Indexalter</dt>
          <dd className="mt-0.5 font-medium text-[#1f2937]">{indexAgeLabel}</dd>
        </div>
      </dl>

      <form action={action} className="mt-6 space-y-4">
        <label className="flex items-start gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            name="forceReembed"
            value="true"
            className="mt-1 rounded border-[#d1d5db] text-primary focus:ring-primary"
          />
          <span>
            Embeddings erzwingen (auch ohne Inhaltsänderung). Nur bei Provider-/Modellwechsel
            nötig.
          </span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Rebuild läuft…" : "Suchindex neu aufbauen"}
        </button>
      </form>
    </section>
  );
}
