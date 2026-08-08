"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { CollectionSort } from "@/lib/catalog/collection-storefront-sort";

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

  return (
    <div className="mt-8 flex flex-col gap-4 rounded-xl border border-(--surface-muted) bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <label htmlFor="collection-sort" className="text-xs font-medium text-(--foreground-muted)">
          Sortierung
        </label>
        <select
          id="collection-sort"
          disabled={pending}
          defaultValue={sort}
          onChange={(e) => apply({ sort: e.target.value })}
          className="rounded-md border border-(--surface-muted) bg-white px-3 py-2 text-sm text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-(--foreground-heading)">
        <input
          type="checkbox"
          className="size-4 checkbox-primary"
          defaultChecked={onlyAvailable}
          disabled={pending}
          onChange={(e) => apply({ verfuegbar: e.target.checked })}
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
