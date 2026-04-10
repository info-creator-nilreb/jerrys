"use client";

import { useActionState } from "react";
import {
  createProduct,
  type ProductFormState,
} from "@/app/admin/(dashboard)/products/actions";
import { ProductFormFields } from "@/app/admin/(dashboard)/products/product-form-fields";
import { AdminFormActionDock } from "@/components/admin/admin-form-action-dock";

const initialState: ProductFormState = null;

const submitClass =
  "shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50";

export function CreateProductForm({
  manufacturers,
}: {
  manufacturers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);

  return (
    <form action={formAction} className="flex max-w-4xl flex-col gap-8 pb-28">
      <ProductFormFields state={state} manufacturers={manufacturers} />

      <AdminFormActionDock>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="isActive" className="text-xs font-medium text-[#6b7280]">
              Im Shop sichtbar
            </label>
            <select
              id="isActive"
              name="isActive"
              defaultValue="true"
              className="max-w-xs rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            >
              <option value="true">Sichtbar im Shop</option>
              <option value="false">Ausgeblendet</option>
            </select>
            {state?.fieldErrors?.isActive ? (
              <p className="text-sm text-red-600">{state.fieldErrors.isActive}</p>
            ) : null}
          </div>
          <button type="submit" disabled={pending} className={submitClass}>
            {pending ? "Wird angelegt…" : "Produkt anlegen"}
          </button>
        </div>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      </AdminFormActionDock>
    </form>
  );
}
