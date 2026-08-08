"use client";

import { ChevronDown, ListFilter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  COLLECTION_SORT_OPTIONS,
  collectionSortLabel,
  type CollectionSort,
} from "@/lib/catalog/collection-storefront-sort";

export type CatalogCategoryFacet = { slug: string; title: string };

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function SortControl({
  id,
  sort,
  pending,
  onSortChange,
  className = "",
}: {
  id: string;
  sort: CollectionSort;
  pending: boolean;
  onSortChange: (value: CollectionSort) => void;
  className?: string;
}) {
  const selectValue = sort === "default" ? "" : sort;
  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        disabled={pending}
        value={selectValue}
        aria-label="Sortieren nach"
        onChange={(e) => {
          const v = e.target.value;
          onSortChange(v === "" ? "default" : (v as CollectionSort));
        }}
        className="min-h-11 w-full min-w-[11rem] appearance-none rounded-md border border-(--surface-muted) bg-white py-2 pr-10 pl-3 text-base text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
      >
        <option value="" disabled={sort !== "default"}>
          Sortieren nach
        </option>
        {COLLECTION_SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-(--foreground-muted)"
        aria-hidden
        strokeWidth={1.75}
      />
    </div>
  );
}

function AvailabilityControl({
  onlyAvailable,
  pending,
  onAvailableChange,
}: {
  onlyAvailable: boolean;
  pending: boolean;
  onAvailableChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-(--foreground-heading)">
      <input
        type="checkbox"
        className="size-5 shrink-0 checkbox-primary"
        checked={onlyAvailable}
        disabled={pending}
        onChange={(e) => onAvailableChange(e.target.checked)}
      />
      Nur verfügbare Produkte
    </label>
  );
}

function PriceRangeControls({
  priceMinEuros,
  priceMaxEuros,
  priceBoundsEuros,
  pending,
  onApply,
}: {
  priceMinEuros: number | null;
  priceMaxEuros: number | null;
  priceBoundsEuros: { min: number; max: number } | null;
  pending: boolean;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [minDraft, setMinDraft] = useState(priceMinEuros != null ? String(priceMinEuros) : "");
  const [maxDraft, setMaxDraft] = useState(priceMaxEuros != null ? String(priceMaxEuros) : "");

  const commit = () => {
    const min = minDraft.trim() === "" ? null : Number.parseInt(minDraft.trim(), 10);
    const max = maxDraft.trim() === "" ? null : Number.parseInt(maxDraft.trim(), 10);
    onApply(
      min != null && Number.isFinite(min) && min >= 0 ? min : null,
      max != null && Number.isFinite(max) && max >= 0 ? max : null,
    );
  };

  const hint =
    priceBoundsEuros != null
      ? `Katalog ca. ${priceBoundsEuros.min}–${priceBoundsEuros.max} €`
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="catalog-price-min" className="text-xs text-(--foreground-muted)">
            Preis ab (€)
          </label>
          <input
            id="catalog-price-min"
            type="number"
            min={0}
            inputMode="numeric"
            disabled={pending}
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            className="mt-1 min-h-11 w-full rounded-md border border-(--surface-muted) bg-white px-3 text-sm text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Min"
          />
        </div>
        <div>
          <label htmlFor="catalog-price-max" className="text-xs text-(--foreground-muted)">
            Preis bis (€)
          </label>
          <input
            id="catalog-price-max"
            type="number"
            min={0}
            inputMode="numeric"
            disabled={pending}
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            className="mt-1 min-h-11 w-full rounded-md border border-(--surface-muted) bg-white px-3 text-sm text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Max"
          />
        </div>
      </div>
      {hint ? <p className="text-xs text-(--foreground-muted)">{hint}</p> : null}
    </div>
  );
}

function CategoryFacetControl({
  facets,
  selectedSlug,
  pending,
  onChange,
}: {
  facets: CatalogCategoryFacet[];
  selectedSlug: string | null;
  pending: boolean;
  onChange: (slug: string | null) => void;
}) {
  if (facets.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="catalog-category-facet" className="text-xs text-(--foreground-muted)">
        Kategorie
      </label>
      <div className="relative">
        <select
          id="catalog-category-facet"
          disabled={pending}
          value={selectedSlug ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          className="min-h-11 w-full appearance-none rounded-md border border-(--surface-muted) bg-white py-2 pr-10 pl-3 text-sm text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="">Alle Kategorien</option>
          {facets.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-(--foreground-muted)"
          aria-hidden
          strokeWidth={1.75}
        />
      </div>
    </div>
  );
}

function CatalogFilterPanel({
  onlyAvailable,
  priceMinEuros,
  priceMaxEuros,
  priceBoundsEuros,
  categoryFacets,
  selectedCategorySlug,
  pending,
  onAvailableChange,
  onPriceApply,
  onCategoryChange,
}: {
  onlyAvailable: boolean;
  priceMinEuros: number | null;
  priceMaxEuros: number | null;
  priceBoundsEuros: { min: number; max: number } | null;
  categoryFacets: CatalogCategoryFacet[];
  selectedCategorySlug: string | null;
  pending: boolean;
  onAvailableChange: (value: boolean) => void;
  onPriceApply: (min: number | null, max: number | null) => void;
  onCategoryChange: (slug: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AvailabilityControl
        onlyAvailable={onlyAvailable}
        pending={pending}
        onAvailableChange={onAvailableChange}
      />
      <div>
        <p className="mb-2 text-xs font-medium text-(--foreground-muted)">Preis</p>
        <PriceRangeControls
          key={`${priceMinEuros ?? "x"}-${priceMaxEuros ?? "x"}`}
          priceMinEuros={priceMinEuros}
          priceMaxEuros={priceMaxEuros}
          priceBoundsEuros={priceBoundsEuros}
          pending={pending}
          onApply={onPriceApply}
        />
      </div>
      {categoryFacets.length > 0 ? (
        <CategoryFacetControl
          facets={categoryFacets}
          selectedSlug={selectedCategorySlug}
          pending={pending}
          onChange={onCategoryChange}
        />
      ) : null}
      {pending ? (
        <p className="text-xs text-(--foreground-muted)" role="status">
          Wird aktualisiert…
        </p>
      ) : null}
    </div>
  );
}

function ActiveFilterChips({
  sort,
  onlyAvailable,
  categorySlug,
  categoryTitle,
  priceMinEuros,
  priceMaxEuros,
  pending,
  onClearSort,
  onClearAvailable,
  onClearCategory,
  onClearPrice,
}: {
  sort: CollectionSort;
  onlyAvailable: boolean;
  categorySlug: string | null;
  categoryTitle: string | null;
  priceMinEuros: number | null;
  priceMaxEuros: number | null;
  pending: boolean;
  onClearSort: () => void;
  onClearAvailable: () => void;
  onClearCategory: () => void;
  onClearPrice: () => void;
}) {
  const sortLabel = collectionSortLabel(sort);
  const priceLabel =
    priceMinEuros != null || priceMaxEuros != null
      ? `Preis ${priceMinEuros ?? "…"}–${priceMaxEuros ?? "…"} €`
      : null;

  if (!onlyAvailable && !sortLabel && !categorySlug && !priceLabel) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Aktive Filter">
      {onlyAvailable ? (
        <li>
          <button
            type="button"
            disabled={pending}
            onClick={onClearAvailable}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--surface-muted) bg-(--surface-soft) px-3 text-sm text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            Nur verfügbar
            <X className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
            <span className="sr-only">entfernen</span>
          </button>
        </li>
      ) : null}
      {categorySlug && categoryTitle ? (
        <li>
          <button
            type="button"
            disabled={pending}
            onClick={onClearCategory}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--surface-muted) bg-(--surface-soft) px-3 text-sm text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {categoryTitle}
            <X className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
            <span className="sr-only">entfernen</span>
          </button>
        </li>
      ) : null}
      {priceLabel ? (
        <li>
          <button
            type="button"
            disabled={pending}
            onClick={onClearPrice}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--surface-muted) bg-(--surface-soft) px-3 text-sm text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {priceLabel}
            <X className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
            <span className="sr-only">entfernen</span>
          </button>
        </li>
      ) : null}
      {sortLabel ? (
        <li>
          <button
            type="button"
            disabled={pending}
            onClick={onClearSort}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--surface-muted) bg-(--surface-soft) px-3 text-sm text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {sortLabel}
            <X className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
            <span className="sr-only">entfernen</span>
          </button>
        </li>
      ) : null}
    </ul>
  );
}

export type CatalogToolbarApplyPatch = {
  sort?: CollectionSort;
  verfuegbar?: boolean;
  preis_min?: number | null;
  preis_max?: number | null;
  kategorie?: string | null;
};

export function CollectionCatalogToolbar({
  sort,
  onlyAvailable,
  resultCount,
  priceMinEuros = null,
  priceMaxEuros = null,
  priceBoundsEuros = null,
  categoryFacets = [],
  selectedCategorySlug = null,
}: {
  sort: CollectionSort;
  onlyAvailable: boolean;
  resultCount?: number;
  priceMinEuros?: number | null;
  priceMaxEuros?: number | null;
  priceBoundsEuros?: { min: number; max: number } | null;
  categoryFacets?: CatalogCategoryFacet[];
  selectedCategorySlug?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);
  const mounted = useClientMounted();
  const panelId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const desktopFilterRef = useRef<HTMLDivElement>(null);

  const filterBadgeCount =
    (onlyAvailable ? 1 : 0) +
    (selectedCategorySlug ? 1 : 0) +
    (priceMinEuros != null || priceMaxEuros != null ? 1 : 0);

  const selectedCategoryTitle =
    categoryFacets.find((c) => c.slug === selectedCategorySlug)?.title ?? null;

  const apply = useCallback(
    (next: CatalogToolbarApplyPatch) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.sort !== undefined) {
        if (next.sort === "default") params.delete("sort");
        else params.set("sort", next.sort);
      }
      if (next.verfuegbar !== undefined) {
        if (next.verfuegbar) params.set("verfuegbar", "1");
        else params.delete("verfuegbar");
      }
      if (next.preis_min !== undefined) {
        if (next.preis_min == null) params.delete("preis_min");
        else params.set("preis_min", String(next.preis_min));
      }
      if (next.preis_max !== undefined) {
        if (next.preis_max == null) params.delete("preis_max");
        else params.set("preis_max", String(next.preis_max));
      }
      if (next.kategorie !== undefined) {
        if (!next.kategorie) params.delete("kategorie");
        else params.set("kategorie", next.kategorie);
      }
      const q = params.toString();
      startTransition(() => {
        router.push(q ? `?${q}` : "?", { scroll: false });
      });
    },
    [router, searchParams],
  );

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (!sheetOpen && !desktopFilterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSheet();
        setDesktopFilterOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, desktopFilterOpen, closeSheet]);

  useEffect(() => {
    if (!desktopFilterOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (desktopFilterRef.current && !desktopFilterRef.current.contains(e.target as Node)) {
        setDesktopFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [desktopFilterOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    closeButtonRef.current?.focus();
  }, [sheetOpen]);

  const filterPanelProps = {
    onlyAvailable,
    priceMinEuros,
    priceMaxEuros,
    priceBoundsEuros,
    categoryFacets,
    selectedCategorySlug,
    pending,
    onAvailableChange: (value: boolean) => apply({ verfuegbar: value }),
    onPriceApply: (min: number | null, max: number | null) =>
      apply({ preis_min: min, preis_max: max }),
    onCategoryChange: (slug: string | null) => apply({ kategorie: slug }),
  };

  const filterChips = (
    <ActiveFilterChips
      sort={sort}
      onlyAvailable={onlyAvailable}
      categorySlug={selectedCategorySlug}
      categoryTitle={selectedCategoryTitle}
      priceMinEuros={priceMinEuros}
      priceMaxEuros={priceMaxEuros}
      pending={pending}
      onClearSort={() => apply({ sort: "default" })}
      onClearAvailable={() => apply({ verfuegbar: false })}
      onClearCategory={() => apply({ kategorie: null })}
      onClearPrice={() => apply({ preis_min: null, preis_max: null })}
    />
  );

  const sheet =
    sheetOpen && mounted ? (
      <div className="fixed inset-0 z-[600000] flex items-end justify-center md:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          aria-label="Filter schließen"
          onClick={closeSheet}
        />
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className="relative z-[600001] flex max-h-[min(85vh,40rem)] w-full flex-col rounded-t-2xl border border-(--surface-muted) bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-(--surface-muted) px-4 py-3">
            <h2
              id={`${panelId}-title`}
              className="text-lg font-semibold text-(--foreground-heading)"
            >
              Filter
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Schließen"
              onClick={closeSheet}
            >
              <X className="size-5" aria-hidden strokeWidth={1.75} />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <CatalogFilterPanel {...filterPanelProps} />
            <ActiveFilterChips
              sort={sort}
              onlyAvailable={onlyAvailable}
              categorySlug={selectedCategorySlug}
              categoryTitle={selectedCategoryTitle}
              priceMinEuros={priceMinEuros}
              priceMaxEuros={priceMaxEuros}
              pending={pending}
              onClearSort={() => apply({ sort: "default" })}
              onClearAvailable={() => apply({ verfuegbar: false })}
              onClearCategory={() => apply({ kategorie: null })}
              onClearPrice={() => apply({ preis_min: null, preis_max: null })}
            />
            <button
              type="button"
              className="mt-6 flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={closeSheet}
            >
              Fertig
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-(--surface-muted) bg-white px-4 text-sm font-medium text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          aria-expanded={sheetOpen}
          aria-controls={sheetOpen ? panelId : undefined}
          onClick={() => setSheetOpen(true)}
        >
          <ListFilter className="size-4 shrink-0" aria-hidden strokeWidth={1.75} />
          Filter
          {filterBadgeCount > 0 ? (
            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
              {filterBadgeCount}
            </span>
          ) : null}
        </button>
        <div ref={desktopFilterRef} className="relative hidden md:block">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-(--surface-muted) bg-white px-4 text-sm font-medium text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={desktopFilterOpen}
            aria-controls={`${panelId}-desktop-filter`}
            onClick={() => setDesktopFilterOpen((open) => !open)}
          >
            <ListFilter className="size-4 shrink-0" aria-hidden strokeWidth={1.75} />
            Filter
            {filterBadgeCount > 0 ? (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                {filterBadgeCount}
              </span>
            ) : null}
          </button>
          {desktopFilterOpen ? (
            <div
              id={`${panelId}-desktop-filter`}
              className="absolute top-[calc(100%+0.5rem)] left-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-(--surface-muted) bg-white p-4 shadow-lg"
            >
              <CatalogFilterPanel {...filterPanelProps} />
            </div>
          ) : null}
        </div>
        <SortControl
          id="collection-sort"
          sort={sort}
          pending={pending}
          onSortChange={(value) => apply({ sort: value })}
          className="min-w-0 flex-1 sm:flex-none"
        />
        {resultCount != null ? (
          <p
            className="w-full text-sm text-(--foreground-muted) sm:ml-auto sm:w-auto"
            aria-live="polite"
          >
            {resultCount} {resultCount === 1 ? "Produkt" : "Produkte"}
          </p>
        ) : null}
      </div>
      {filterChips}
      {mounted && sheet ? createPortal(sheet, document.body) : null}
    </>
  );
}
