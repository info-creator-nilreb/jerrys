"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { formatPrice, centsToPriceInputString } from "@/lib/catalog/format";
import {
  updateProductVariant,
  type VariantActionState,
} from "@/app/admin/(dashboard)/products/variant-actions";
import type { AdminProductVariantRow } from "@/app/admin/(dashboard)/products/product-variants-section";

const initial: VariantActionState = null;

export function ProductVariantEditRow({
  variant,
  currency,
}: {
  variant: AdminProductVariantRow;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateProductVariant, initial);
  const fe = state?.fieldErrors ?? {};

  if (variant.isDefault) {
    return (
      <tr className="border-b border-[#f3f4f6] text-[#374151]">
        <td className="py-2.5 pr-4 font-mono text-xs">{variant.sku}</td>
        <td className="py-2.5 pr-4">{variant.title?.trim() || "—"}</td>
        <td className="py-2.5 pr-4 tabular-nums">{formatPrice(variant.priceGrossCents, currency)}</td>
        <td className="py-2.5 pr-4 tabular-nums">{variant.availableQuantity}</td>
        <td className="py-2.5">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Standard
          </span>
          {!variant.isActive ? (
            <span className="ml-1 text-xs text-[#6b7280]">inaktiv</span>
          ) : null}
        </td>
        <td className="py-2.5 text-xs text-[#6b7280]">Hauptformular</td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-b border-[#f3f4f6] text-[#374151]">
        <td className="py-2.5 pr-4 font-mono text-xs">{variant.sku}</td>
        <td className="py-2.5 pr-4">{variant.title?.trim() || "—"}</td>
        <td className="py-2.5 pr-4 tabular-nums">{formatPrice(variant.priceGrossCents, currency)}</td>
        <td className="py-2.5 pr-4 tabular-nums">{variant.availableQuantity}</td>
        <td className="py-2.5">
          {!variant.isActive ? (
            <span className="text-xs text-[#6b7280]">inaktiv</span>
          ) : (
            <span className="text-xs text-[#374151]">aktiv</span>
          )}
        </td>
        <td className="py-2.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-[#e3e4e8] px-2 py-1 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]"
            aria-expanded={open}
            aria-controls={`variant-edit-${variant.id}`}
          >
            <Pencil className="size-3.5" aria-hidden />
            {open ? "Schließen" : "Bearbeiten"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
          <td colSpan={6} className="px-3 py-4">
            <form
              id={`variant-edit-${variant.id}`}
              action={formAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <input type="hidden" name="variantId" value={variant.id} />
              <div className="flex flex-col gap-1">
                <label htmlFor={`edit-sku-${variant.id}`} className="text-xs font-medium text-[#6b7280]">
                  SKU <span className="text-primary">*</span>
                </label>
                <input
                  id={`edit-sku-${variant.id}`}
                  name="sku"
                  required
                  defaultValue={variant.sku}
                  className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm"
                />
                {fe.sku ? <p className="text-xs text-red-600">{fe.sku}</p> : null}
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`edit-title-${variant.id}`}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  Bezeichnung
                </label>
                <input
                  id={`edit-title-${variant.id}`}
                  name="title"
                  defaultValue={variant.title ?? ""}
                  className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`edit-price-${variant.id}`}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  Preis brutto (EUR) <span className="text-primary">*</span>
                </label>
                <input
                  id={`edit-price-${variant.id}`}
                  name="priceGrossEuro"
                  required
                  inputMode="decimal"
                  defaultValue={centsToPriceInputString(variant.priceGrossCents)}
                  className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm"
                />
                {fe.priceGrossEuro ? <p className="text-xs text-red-600">{fe.priceGrossEuro}</p> : null}
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`edit-available-${variant.id}`}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  Verfügbar (Shop)
                </label>
                <input
                  id={`edit-available-${variant.id}`}
                  name="availableQuantity"
                  type="number"
                  min={0}
                  defaultValue={variant.availableQuantity}
                  className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`edit-stock-${variant.id}`}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  Lagerbestand
                </label>
                <input
                  id={`edit-stock-${variant.id}`}
                  name="stockQuantity"
                  type="number"
                  min={0}
                  defaultValue={variant.stockQuantity}
                  className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id={`edit-active-${variant.id}`}
                  name="isActive"
                  type="checkbox"
                  defaultChecked={variant.isActive}
                  className="size-4 accent-primary"
                />
                <label htmlFor={`edit-active-${variant.id}`} className="text-sm text-[#374151]">
                  Im Shop aktiv (PDP-Auswahl)
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
                >
                  {pending ? "Speichern…" : "Änderungen speichern"}
                </button>
                {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
                {state?.ok ? (
                  <p className="text-sm font-medium text-primary" role="status">
                    Gespeichert.
                  </p>
                ) : null}
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
