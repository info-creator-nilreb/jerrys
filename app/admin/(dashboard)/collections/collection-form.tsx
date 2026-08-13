"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  saveCollection,
  type CollectionFormState,
} from "@/app/admin/(dashboard)/collections/actions";
import {
  ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING,
  AdminFormActionDock,
} from "@/components/admin/admin-form-action-dock";

const initial: CollectionFormState = null;

type ProductOption = { id: string; title: string; slug: string; isActive: boolean };

export function CollectionForm({
  collection,
  products,
  submitLabel,
}: {
  collection?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    productIds: string[];
  };
  products: ProductOption[];
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveCollection, initial);
  const fe = state?.fieldErrors ?? {};
  const selected = new Set(collection?.productIds ?? []);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className={`space-y-8 ${ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING}`}>
      {collection ? <input type="hidden" name="id" value={collection.id} /> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="collection-title" className="text-xs font-medium text-[#6b7280]">
            Titel <span className="text-primary">*</span>
          </label>
          <input
            id="collection-title"
            name="title"
            required
            defaultValue={collection?.title ?? ""}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
          />
          {fe.title ? <p className="text-xs text-red-600">{fe.title}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="collection-slug" className="text-xs font-medium text-[#6b7280]">
            URL-Slug <span className="text-primary">*</span>
          </label>
          <input
            id="collection-slug"
            name="slug"
            required
            defaultValue={collection?.slug ?? ""}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 font-mono text-sm"
            placeholder="z. B. bestseller"
          />
          {fe.slug ? <p className="text-xs text-red-600">{fe.slug}</p> : null}
          <p className="text-xs text-[#9ca3af]">Storefront: /kollektionen/[slug]</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="collection-sort" className="text-xs font-medium text-[#6b7280]">
            Sortierung
          </label>
          <input
            id="collection-sort"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={collection?.sortOrder ?? 0}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="collection-description" className="text-xs font-medium text-[#6b7280]">
            Beschreibung (optional)
          </label>
          <textarea
            id="collection-description"
            name="description"
            rows={3}
            defaultValue={collection?.description ?? ""}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="collection-active"
            name="isActive"
            type="checkbox"
            defaultChecked={collection?.isActive ?? true}
            className="size-4 checkbox-primary"
          />
          <label htmlFor="collection-active" className="text-sm text-[#374151]">
            Im Shop sichtbar
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[#374151]">Produkte in dieser Kollektion</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Reihenfolge entspricht der Auswahl (oben nach unten). Nur aktive Produkte erscheinen in der
          Storefront. Shop-Navigation bindet Kollektionen über Kategorien — hier ist die
          Produktzuordnung.
        </p>
        {products.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Noch keine Produkte im Katalog.</p>
        ) : (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-[#e8eaed] p-3">
            {products.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    name="productIds"
                    value={p.id}
                    defaultChecked={selected.has(p.id)}
                    className="mt-0.5 checkbox-primary size-4"
                  />
                  <span>
                    {p.title}
                    {!p.isActive ? (
                      <span className="ml-1 text-xs text-[#9ca3af]">(inaktiv)</span>
                    ) : null}
                    <span className="ml-1 font-mono text-xs text-[#9ca3af]">{p.slug}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminFormActionDock>
        {state?.ok ? (
          <p className="mr-auto text-sm font-medium text-primary" role="status">
            Gespeichert.
          </p>
        ) : state?.error ? (
          <p className="mr-auto text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : (
          <span className="mr-auto hidden text-sm text-[#6b7280] sm:inline">
            Änderungen speichern, um die Kollektion zu aktualisieren.
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Wird gespeichert…" : submitLabel}
        </button>
      </AdminFormActionDock>
    </form>
  );
}
