"use client";

import Link from "next/link";
import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import type { AdminShopAssignmentOption } from "@/lib/catalog/product-shop-membership";

type Props = {
  state: ProductFormState;
  options: AdminShopAssignmentOption;
  defaults: {
    categoryIds: string[];
    extraCollectionIds: string[];
  };
};

/**
 * Shopify-ähnliche Shop-Zuordnung am Produkt:
 * Kategorien (über Primary-Kollektion) + optionale Merchandising-Kollektionen.
 */
export function ProductShopAssignmentFields({ state, options, defaults }: Props) {
  const fe = state?.fieldErrors ?? {};
  const selectedCategories = new Set(defaults.categoryIds);
  const selectedExtra = new Set(defaults.extraCollectionIds);

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Kategorien &amp; Kollektionen</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Ordne das Produkt direkt hier zu — ohne Umweg über den Menüpunkt Kategorien. Im Shop erscheinen
        Produkte in Kategorien über deren verknüpfte Kollektion (wie bei Shopify).
      </p>

      <div className="mt-6 h-px bg-[#e8eaed]" />

      <div className="mt-6 flex flex-col gap-6">
        <fieldset>
          <legend className="text-xs font-medium text-[#6b7280]">Shop-Kategorien</legend>
          {options.categories.length === 0 ? (
            <p className="mt-2 text-sm text-[#9ca3af]">
              Noch keine Kategorien.{" "}
              <Link href="/admin/categories/new" className="font-medium text-primary hover:underline">
                Kategorie anlegen
              </Link>
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {options.categories.map((cat) => {
                const label = cat.parentTitle
                  ? `${cat.parentTitle} → ${cat.title}`
                  : cat.title;
                return (
                  <li key={cat.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5 hover:bg-[#f3f4f6]">
                      <input
                        type="checkbox"
                        name="categoryIds"
                        value={cat.id}
                        defaultChecked={selectedCategories.has(cat.id)}
                        className="mt-0.5 size-4 checkbox-primary"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#1f2937]">{label}</span>
                        <span className="mt-0.5 block text-xs text-[#6b7280]">/{cat.slug}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {fe.categoryIds ? <p className="mt-2 text-sm text-red-600">{fe.categoryIds}</p> : null}
        </fieldset>

        {options.campaignCollections.length > 0 ? (
          <fieldset>
            <legend className="text-xs font-medium text-[#6b7280]">
              Weitere Kollektionen (Merchandising)
            </legend>
            <p className="mt-1 text-xs text-[#6b7280]">
              Kampagnen- oder Sonderkollektionen ohne eigene Shop-Kategorie.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {options.campaignCollections.map((col) => (
                <li key={col.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 hover:bg-[#f9fafb]">
                    <input
                      type="checkbox"
                      name="extraCollectionIds"
                      value={col.id}
                      defaultChecked={selectedExtra.has(col.id)}
                      className="mt-0.5 size-4 checkbox-primary"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#1f2937]">{col.title}</span>
                      <span className="mt-0.5 block text-xs text-[#6b7280]">/{col.slug}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {fe.extraCollectionIds ? (
              <p className="mt-2 text-sm text-red-600">{fe.extraCollectionIds}</p>
            ) : null}
          </fieldset>
        ) : null}
      </div>
    </section>
  );
}
