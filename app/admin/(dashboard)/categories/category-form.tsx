"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  saveCategory,
  type CategoryFormState,
} from "@/app/admin/(dashboard)/categories/actions";
import {
  ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING,
  AdminFormActionDock,
} from "@/components/admin/admin-form-action-dock";
import { AdminSlugField } from "@/components/admin/admin-slug-field";
import { useAutoSlugFromTitle } from "@/components/admin/use-auto-slug-from-title";

const initial: CategoryFormState = null;

type CollectionOption = { id: string; title: string; slug: string; isActive: boolean };
type ParentOption = { id: string; title: string; slug: string };

export function CategoryForm({
  category,
  collections,
  parentOptions,
  submitLabel,
}: {
  category?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    parentId: string | null;
    collectionIds: string[];
    hasChildren: boolean;
  };
  collections: CollectionOption[];
  parentOptions: ParentOption[];
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveCategory, initial);
  const fe = state?.fieldErrors ?? {};
  const selected = new Set(category?.collectionIds ?? []);
  const {
    title,
    setTitle,
    slug,
    setSlug,
    slugManuallyEdited,
    regenerateSlugFromTitle,
  } = useAutoSlugFromTitle({
    initialTitle: category?.title ?? "",
    initialSlug: category?.slug ?? "",
    mode: "catalog",
  });

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className={`space-y-8 ${ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING}`}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="category-title" className="text-xs font-medium text-[#6b7280]">
            Titel <span className="text-primary">*</span>
          </label>
          <input
            id="category-title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
          />
          {fe.title ? <p className="text-xs text-red-600">{fe.title}</p> : null}
        </div>
        <AdminSlugField
          id="category-slug"
          name="slug"
          slug={slug}
          onSlugChange={setSlug}
          slugManuallyEdited={slugManuallyEdited}
          onRegenerateFromTitle={regenerateSlugFromTitle}
          error={fe.slug}
          hint="Storefront: /kategorien/[slug]"
          inputClassName="rounded-md border border-[#e3e4e8] px-3 py-2 font-mono text-sm"
          placeholder="z. B. hund"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="category-sort" className="text-xs font-medium text-[#6b7280]">
            Sortierung
          </label>
          <input
            id="category-sort"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={category?.sortOrder ?? 0}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="category-parent" className="text-xs font-medium text-[#6b7280]">
            Übergeordnete Kategorie (optional)
          </label>
          <select
            id="category-parent"
            name="parentId"
            defaultValue={category?.parentId ?? ""}
            disabled={category?.hasChildren}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
          >
            <option value="">— Hauptkategorie (keine übergeordnete) —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.slug})
              </option>
            ))}
          </select>
          {category?.hasChildren ? (
            <p className="text-xs text-[#6b7280]">
              Diese Kategorie hat Unterkategorien und muss auf oberster Ebene bleiben.
            </p>
          ) : null}
          {fe.parentId ? <p className="text-xs text-red-600">{fe.parentId}</p> : null}
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="category-description" className="text-xs font-medium text-[#6b7280]">
            Beschreibung (optional)
          </label>
          <textarea
            id="category-description"
            name="description"
            rows={3}
            defaultValue={category?.description ?? ""}
            className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="category-active"
            name="isActive"
            type="checkbox"
            defaultChecked={category?.isActive ?? true}
            className="checkbox-primary size-4"
          />
          <label htmlFor="category-active" className="text-sm text-[#374151]">
            Aktiv (erscheint in der Header-Navigation, wenn verknüpfte Kollektionen Produkte haben)
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[#374151]">Kollektionen in dieser Kategorie</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Produkte erscheinen hier über die ausgewählten Kollektionen (Shopify-Modell). Produkte
          werden nur in Kollektionen zugeordnet, nicht direkt in Kategorien.
        </p>
        {collections.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">
            Noch keine Kollektionen. Lege zuerst unter Katalog → Kollektionen Produkte an und
            verknüpfe sie hier.
          </p>
        ) : (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-[#e8eaed] p-3">
            {collections.map((c) => (
              <li key={c.id}>
                <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    name="collectionIds"
                    value={c.id}
                    defaultChecked={selected.has(c.id)}
                    className="checkbox-primary mt-0.5 size-4"
                  />
                  <span>
                    {c.title}
                    {!c.isActive ? (
                      <span className="ml-1 text-xs text-[#9ca3af]">(inaktiv)</span>
                    ) : null}
                    <span className="ml-1 font-mono text-xs text-[#9ca3af]">{c.slug}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {fe.collectionIds ? <p className="mt-2 text-xs text-red-600">{fe.collectionIds}</p> : null}
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
            Änderungen speichern, um die Kategorie zu aktualisieren.
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
