"use client";

import { useActionState } from "react";
import { formatPrice } from "@/lib/catalog/format";
import {
  createProductVariant,
  type VariantActionState,
} from "@/app/admin/(dashboard)/products/variant-actions";

const initial: VariantActionState = null;

export type AdminProductVariantRow = {
  id: string;
  sku: string;
  title: string | null;
  isDefault: boolean;
  isActive: boolean;
  priceGrossCents: number;
  availableQuantity: number;
  stockQuantity: number;
};

export function ProductVariantsSection({
  productId,
  variants,
  currency,
}: {
  productId: string;
  variants: AdminProductVariantRow[];
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(createProductVariant, initial);
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Varianten & SKU</h2>
      <p className="mt-2 text-sm text-[#6b7280]">
        Die <strong>Standard-Variante</strong> wird über Preis und Bestand im Formular unten gepflegt.
        Weitere Varianten haben eigene SKU, Preis und Lager.
      </p>

      {variants.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8eaed] text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                <th className="pb-2 pr-4">SKU</th>
                <th className="pb-2 pr-4">Bezeichnung</th>
                <th className="pb-2 pr-4">Preis</th>
                <th className="pb-2 pr-4">Verfügbar</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-b border-[#f3f4f6] text-[#374151]">
                  <td className="py-2.5 pr-4 font-mono text-xs">{v.sku}</td>
                  <td className="py-2.5 pr-4">{v.title?.trim() || "—"}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatPrice(v.priceGrossCents, currency)}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{v.availableQuantity}</td>
                  <td className="py-2.5">
                    {v.isDefault ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Standard
                      </span>
                    ) : null}
                    {!v.isActive ? (
                      <span className="ml-1 text-xs text-[#6b7280]">inaktiv</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-8 border-t border-[#e8eaed] pt-6">
        <h3 className="text-sm font-semibold text-[#374151]">Weitere Variante anlegen</h3>
        <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="productId" value={productId} />
          <div className="flex flex-col gap-1 sm:col-span-1">
            <label htmlFor="variant-sku" className="text-xs font-medium text-[#6b7280]">
              SKU <span className="text-primary">*</span>
            </label>
            <input
              id="variant-sku"
              name="sku"
              required
              className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
              placeholder="z. B. je-1001-rot"
            />
            {fe.sku ? <p className="text-xs text-red-600">{fe.sku}</p> : null}
          </div>
          <div className="flex flex-col gap-1 sm:col-span-1">
            <label htmlFor="variant-title" className="text-xs font-medium text-[#6b7280]">
              Bezeichnung (optional)
            </label>
            <input
              id="variant-title"
              name="title"
              className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
              placeholder="z. B. Rot / Größe M"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="variant-price" className="text-xs font-medium text-[#6b7280]">
              Preis brutto (EUR) <span className="text-primary">*</span>
            </label>
            <input
              id="variant-price"
              name="priceGrossEuro"
              required
              inputMode="decimal"
              className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
              placeholder="79,00"
            />
            {fe.priceGrossEuro ? <p className="text-xs text-red-600">{fe.priceGrossEuro}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="variant-available" className="text-xs font-medium text-[#6b7280]">
              Verfügbar (Shop)
            </label>
            <input
              id="variant-available"
              name="availableQuantity"
              type="number"
              min={0}
              defaultValue={0}
              className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="variant-stock" className="text-xs font-medium text-[#6b7280]">
              Lagerbestand
            </label>
            <input
              id="variant-stock"
              name="stockQuantity"
              type="number"
              min={0}
              defaultValue={0}
              className="rounded-md border border-[#e3e4e8] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
            >
              {pending ? "Wird gespeichert…" : "Variante hinzufügen"}
            </button>
          </div>
        </form>
        {state?.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
        {state?.ok ? (
          <p className="mt-2 text-sm font-medium text-primary" role="status">
            Variante gespeichert.
          </p>
        ) : null}
      </div>
    </section>
  );
}
