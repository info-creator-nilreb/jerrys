"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { formatPrice, centsToPriceInputString } from "@/lib/catalog/format";
import {
  updateDefaultVariantTitle,
  updateProductVariant,
  type VariantActionState,
} from "@/app/admin/(dashboard)/products/variant-actions";
import type { AdminProductVariantRow } from "@/app/admin/(dashboard)/products/product-variants-section";

const initial: VariantActionState = null;

function BezeichnungCell({ title }: { title: string | null }) {
  const t = title?.trim();
  if (t) return <>{t}</>;
  return <span className="text-[#9ca3af]">z. B. Farbe …</span>;
}

export function ProductVariantEditRow({
  variant,
  currency,
}: {
  variant: AdminProductVariantRow;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    variant.isDefault ? updateDefaultVariantTitle : updateProductVariant,
    initial,
  );
  const fe = state?.fieldErrors ?? {};

  useEffect(() => {
    if (!state?.ok) return;
    setOpen(false);
    router.refresh();
  }, [state?.ok, state?.revision, router]);

  if (variant.isDefault) {
    return (
      <>
        <tr className="border-b border-[#f3f4f6] text-[#374151]">
          <td className="py-2.5 pr-4 font-mono text-xs">{variant.sku}</td>
          <td className="py-2.5 pr-4">
            <BezeichnungCell title={variant.title} />
          </td>
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
                className="flex max-w-xl flex-col gap-3"
              >
                <input type="hidden" name="variantId" value={variant.id} />
                <p className="text-xs text-[#6b7280]">
                  Hier die Farbe bzw. Option der Standard-SKU eintragen (Shop-Auswahl). SKU, Preis und
                  Bestand bleiben im Produktformular oben.
                </p>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`edit-title-${variant.id}`}
                    className="text-xs font-medium text-[#6b7280]"
                  >
                    Bezeichnung (z. B. Farbe)
                  </label>
                  <input
                    id={`edit-title-${variant.id}`}
                    name="title"
                    defaultValue={variant.title ?? ""}
                    placeholder="z. B. natur, beige, Standard"
                    maxLength={120}
                    className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm"
                    autoFocus
                  />
                  {fe.title ? <p className="text-xs text-red-600">{fe.title}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
                  >
                    {pending ? "Speichern…" : "Bezeichnung speichern"}
                  </button>
                  {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
                </div>
              </form>
            </td>
          </tr>
        ) : null}
      </>
    );
  }

  return (
    <>
      <tr className="border-b border-[#f3f4f6] text-[#374151]">
        <td className="py-2.5 pr-4 font-mono text-xs">{variant.sku}</td>
        <td className="py-2.5 pr-4">
          <BezeichnungCell title={variant.title} />
        </td>
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
                  className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm font-mono"
                />
                {fe.sku ? <p className="text-xs text-red-600">{fe.sku}</p> : null}
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`edit-title-${variant.id}`}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  Bezeichnung (z. B. Farbe)
                </label>
                <input
                  id={`edit-title-${variant.id}`}
                  name="title"
                  defaultValue={variant.title ?? ""}
                  placeholder="z. B. schwarz"
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
                  className="size-4 checkbox-primary"
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
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
