"use client";

import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

type Props = {
  state: ProductFormState;
  defaults: {
    variantOptionName: string;
  };
};

/** Option-Name für alle Varianten eines Produkts (Shopify „Option1 Name“). */
export function ProductVariantOptionFields({ state, defaults }: Props) {
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Varianten-Option</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Name der Varianten-Kategorie (z.&nbsp;B. „Farbe“, „Größe“). Der konkrete Wert (z.&nbsp;B.
        „rot“) wird pro Variante unten gepflegt.
      </p>
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 max-w-md flex flex-col gap-1">
        <label htmlFor="variantOptionName" className="text-xs font-medium text-[#6b7280]">
          Option-Name (optional)
        </label>
        <input
          id="variantOptionName"
          name="variantOptionName"
          type="text"
          maxLength={80}
          defaultValue={defaults.variantOptionName}
          placeholder="z. B. Farbe"
          className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
        />
        {fe.variantOptionName ? (
          <p className="text-sm text-red-600">{fe.variantOptionName}</p>
        ) : null}
      </div>
    </section>
  );
}
