"use client";

import Link from "next/link";

type CategoryOption = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  parentTitle: string | null;
};

export function ProductCategoriesFields({
  categories,
  defaults,
  fieldErrors,
}: {
  categories: CategoryOption[];
  defaults: {
    categoryIds: string[];
    primaryCategoryId: string | null;
  };
  fieldErrors?: Record<string, string>;
}) {
  const selected = new Set(defaults.categoryIds);
  const fe = fieldErrors ?? {};

  if (categories.length === 0) {
    return (
      <section className="rounded-lg border border-[#e8eaed] p-4">
        <h2 className="text-sm font-semibold text-[#374151]">Kategorien (Taxonomie)</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Noch keine Kategorien angelegt.{" "}
          <Link href="/admin/categories/new" className="font-medium text-primary hover:underline">
            Kategorie anlegen
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#e8eaed] p-4">
      <h2 className="text-sm font-semibold text-[#374151]">Kategorien (Taxonomie)</h2>
      <p className="mt-1 text-xs text-[#6b7280]">
        Primary-Kategorie für Breadcrumbs und Listings (Epic 10). Legacy-Feld „Kategorie-Tag“ bleibt
        unabhängig in den Storefront-Details.
      </p>
      <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {categories.map((c) => (
          <li key={c.id} className="flex flex-wrap items-start gap-3 rounded-md border border-[#f3f4f6] px-3 py-2">
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                name="categoryIds"
                value={c.id}
                defaultChecked={selected.has(c.id)}
                className="checkbox-primary mt-0.5 size-4"
              />
              <span>
                {c.title}
                {c.parentTitle ? (
                  <span className="ml-1 text-xs text-[#9ca3af]">({c.parentTitle})</span>
                ) : null}
                {!c.isActive ? (
                  <span className="ml-1 text-xs text-[#9ca3af]">(inaktiv)</span>
                ) : null}
                <span className="ml-1 font-mono text-xs text-[#9ca3af]">{c.slug}</span>
              </span>
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-[#6b7280]">
              <input
                type="radio"
                name="primaryCategoryId"
                value={c.id}
                defaultChecked={defaults.primaryCategoryId === c.id}
                className="size-3.5 accent-primary"
              />
              Primary
            </label>
          </li>
        ))}
      </ul>
      {fe.categoryIds ? <p className="mt-2 text-xs text-red-600">{fe.categoryIds}</p> : null}
      {fe.primaryCategoryId ? (
        <p className="mt-2 text-xs text-red-600">{fe.primaryCategoryId}</p>
      ) : null}
    </section>
  );
}
