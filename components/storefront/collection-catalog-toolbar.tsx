"use client";

import { ListFilter, X } from "lucide-react";
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
import type { CollectionSort } from "@/lib/catalog/collection-storefront-sort";

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function CatalogFilterControls({
  idPrefix,
  sort,
  onlyAvailable,
  sortOptions,
  pending,
  onSortChange,
  onAvailableChange,
}: {
  idPrefix: string;
  sort: CollectionSort;
  onlyAvailable: boolean;
  sortOptions: { value: CollectionSort; label: string }[];
  pending: boolean;
  onSortChange: (value: string) => void;
  onAvailableChange: (value: boolean) => void;
}) {
  const sortId = `${idPrefix}-sort`;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <label htmlFor={sortId} className="text-xs font-medium text-(--foreground-muted)">
          Sortierung
        </label>
        <select
          id={sortId}
          disabled={pending}
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="min-h-11 w-full rounded-md border border-(--surface-muted) bg-white px-3 py-2 text-base text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-[14rem] sm:text-sm"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
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
  sortOptions,
  pending,
  onClearSort,
  onClearAvailable,
}: {
  sort: CollectionSort;
  onlyAvailable: boolean;
  sortOptions: { value: CollectionSort; label: string }[];
  pending: boolean;
  onClearSort: () => void;
  onClearAvailable: () => void;
}) {
  if (!onlyAvailable && sort === "default") return null;
  const sortLabel = sortOptions.find((o) => o.value === sort)?.label;

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
      {sort !== "default" && sortLabel ? (
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

export function CollectionCatalogToolbar({
  sort,
  onlyAvailable,
  defaultSortLabel = "Reihenfolge Kollektion",
}: {
  sort: CollectionSort;
  onlyAvailable: boolean;
  /** Label für Sortierung „default“ (Kategorie vs. Kollektion). */
  defaultSortLabel?: string;
}) {
  const sortOptions: { value: CollectionSort; label: string }[] = [
    { value: "default", label: defaultSortLabel },
    { value: "title-asc", label: "Name A–Z" },
    { value: "price-asc", label: "Preis aufsteigend" },
    { value: "price-desc", label: "Preis absteigend" },
  ];
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const mounted = useClientMounted();
  const panelId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activeCount = (onlyAvailable ? 1 : 0) + (sort !== "default" ? 1 : 0);

  const apply = useCallback(
    (next: { sort?: string; verfuegbar?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.sort !== undefined) {
        if (next.sort === "default") params.delete("sort");
        else params.set("sort", next.sort);
      }
      if (next.verfuegbar !== undefined) {
        if (next.verfuegbar) params.set("verfuegbar", "1");
        else params.delete("verfuegbar");
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
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

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

  const filterChips = (
    <ActiveFilterChips
      sort={sort}
      onlyAvailable={onlyAvailable}
      sortOptions={sortOptions}
      pending={pending}
      onClearSort={() => apply({ sort: "default" })}
      onClearAvailable={() => apply({ verfuegbar: false })}
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
              Filter & Sortierung
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
            <CatalogFilterControls
              idPrefix={`${panelId}-sheet`}
              sort={sort}
              onlyAvailable={onlyAvailable}
              sortOptions={sortOptions}
              pending={pending}
              onSortChange={(value) => apply({ sort: value })}
              onAvailableChange={(value) => apply({ verfuegbar: value })}
            />
            <ActiveFilterChips
              sort={sort}
              onlyAvailable={onlyAvailable}
              sortOptions={sortOptions}
              pending={pending}
              onClearSort={() => apply({ sort: "default" })}
              onClearAvailable={() => apply({ verfuegbar: false })}
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
      <div className="mt-8 md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-(--surface-muted) bg-white px-4 text-sm font-medium text-(--foreground-heading) transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={sheetOpen}
          aria-controls={sheetOpen ? panelId : undefined}
          onClick={() => setSheetOpen(true)}
        >
          <ListFilter className="size-4 shrink-0" aria-hidden strokeWidth={1.75} />
          Filter & Sortierung
          {activeCount > 0 ? (
            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
        {filterChips}
      </div>

      <div className="mt-8 hidden rounded-xl border border-(--surface-muted) bg-white p-4 md:block">
        <CatalogFilterControls
          idPrefix="collection"
          sort={sort}
          onlyAvailable={onlyAvailable}
          sortOptions={sortOptions}
          pending={pending}
          onSortChange={(value) => apply({ sort: value })}
          onAvailableChange={(value) => apply({ verfuegbar: value })}
        />
        <ActiveFilterChips
          sort={sort}
          onlyAvailable={onlyAvailable}
          sortOptions={sortOptions}
          pending={pending}
          onClearSort={() => apply({ sort: "default" })}
          onClearAvailable={() => apply({ verfuegbar: false })}
        />
      </div>

      {mounted && sheet ? createPortal(sheet, document.body) : null}
    </>
  );
}
